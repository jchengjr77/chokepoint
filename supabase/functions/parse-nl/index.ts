// Supabase Edge Function: parses free-text grappling training notes into
// structured graph nodes/edges using the Claude API. The Anthropic API key
// is read from Supabase secrets (ANTHROPIC_API_KEY) — never exposed to the
// client.
//
// Deploy with: supabase functions deploy parse-nl
// Set secret with: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { createClient } from 'jsr:@supabase/supabase-js@2'
import libraryJson from '../_shared/library.json' with { type: 'json' }

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

// This is the only endpoint in the app that costs real money per call
// (everything else is free Postgres reads/writes), so it's rate-limited
// per user per calendar week to bound worst-case cost. The account below
// is exempt — the developer's own account, used for ongoing testing.
const WEEKLY_PARSE_LIMIT = 40
const UNLIMITED_EMAILS = new Set(['jonathanchengjr77@gmail.com'])

function currentWeekStart(): string {
  // Monday-anchored calendar week, as a YYYY-MM-DD date (matches the
  // nlp_usage.week_start column type).
  const now = new Date()
  const day = now.getUTCDay() // 0 = Sunday
  const diffToMonday = day === 0 ? 6 : day - 1
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday))
  return monday.toISOString().slice(0, 10)
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LibraryEntry {
  id: string
  label: string
  aliases: string[]
  tags: string[]
  rulesets: string[]
}

interface CustomEntry {
  id: string
  label: string
  type: 'position' | 'submission'
}

interface RequestBody {
  text: string
  existingLibraryIds: string[]
  customEntries?: CustomEntry[]
}

// Static across every request (same for all users) so it can be marked
// with cache_control — the library dump is ~8K tokens and otherwise gets
// re-billed at full input price on every single NL parse call. The
// existingIds list is per-request/per-user and MUST NOT be interpolated
// in here: appending it after this block would still invalidate the
// cached prefix if it changed the preceding bytes, so it's passed in the
// user message instead, leaving this string byte-for-byte identical
// across all calls.
function buildSystemPrompt(positions: LibraryEntry[], submissions: LibraryEntry[]): string {
  const libraryDump = JSON.stringify({ positions, submissions }, null, 2)

  return `You are a parser that extracts structured grappling (Brazilian Jiu-Jitsu, wrestling, judo, no-gi submission grappling) training data from free-text descriptions.

You will receive a user's free-text description of what they trained or learned, a list of libraryIds already on the user's graph, an optional list of the user's own custom (user-defined) library entries, plus the full canonical library of positions and submissions.

RULES:
0. The text may not describe any grappling training at all — it could be off-topic, a random question, spam, or gibberish. Do not force a match just because some word loosely resembles a library entry's label (e.g. "roll" in "lobster roll" is NOT a grappling "roll"; "guard" in an unrelated sentence about a security guard is NOT "Closed Guard"). If the text does not genuinely describe grappling positions, submissions, or transitions the user trained, return empty "nodes" and "edges" arrays and an empty "unrecognized" array — do NOT put non-grappling words into "unrecognized" either, since that field is only for grappling terms that failed to match the library, not for arbitrary off-topic text.
1. Extract every position and submission mentioned in the text.
2. Every extracted position/submission MUST map to an entry in the provided library OR the user's custom entries list given in the user message (match by label, case-insensitive, fuzzy match acceptable). Never invent a libraryId that isn't in either list. Fuzzy matching means tolerating typos, abbreviations, and rephrasing of a genuine grappling term — it does NOT mean treating an unrelated English word as a match just because it shares a substring with a library label.
3. CHAIN EXTRACTION — this is the part most likely to be under-extracted, be thorough: read the text as a left-to-right sequence of steps and track a "current position" as you go, starting from the first position/submission mentioned. Every time the text moves from the current position/submission to a new one — whether joined by "to", "then", "into", "and then finished with", a comma, or just narrated as the next thing that happened — that is one edge (source = current position, target = the new one), and the new one becomes the current position for the next step. A sentence describing N steps (N+1 positions/submissions in sequence) must produce exactly N edges. Do not stop after the first edge or the first sentence clause — walk the ENTIRE text to the end before deciding you're done. Example: "closed guard to mount, mount to back control, then rear naked choke" is a 3-edge chain: closed guard->mount, mount->back control, back control->rear naked choke — even though it spans multiple clauses and only the last step is a submission.
4. Positions and submissions are a closed, curated set — but transitions between them are NOT. There is no fixed list of "known" transitions: two positions in this library can be connected by any technique, and the same pair of positions can be connected in many different ways (different sweeps, passes, escapes, entries). Do not limit yourself to "typical" or "textbook" connections — trust the user's description of what they actually did, even if it's an unusual or uncommon route between two positions.
5. The edge "label" should be a short, natural description of the specific technique the user described (e.g. "berimbolo", "far-side armbar", "russian 2-on-1 to back take") — write it in your own words based on what the user said, don't force it to match any pre-existing phrasing. Always write it in plain lowercase (the client applies its own title-casing for display) — do not capitalize words yourself. If the user only said they went from one position/submission to another without naming a specific technique (e.g. "north south to kimura"), leave "label" as an empty string "" rather than inventing or guessing a technique name — do not fabricate a label just to fill the field.
6. If a genuine grappling term (position, submission, or technique) cannot be confidently matched to any library entry, add the raw term to "unrecognized" and do NOT include it in nodes/edges.
7. Mark "alreadyOnGraph": true for any libraryId that appears in the "existingLibraryIds" list given in the user message.
8. The user message begins with a line "today: YYYY-MM-DD (Weekday)". If the user's text references when the training happened (e.g. "yesterday", "on Monday", "last Tuesday", "this morning", "on 8/5", "a couple days ago"), resolve it to an absolute date relative to "today" and set "trainedAt" to that date as "YYYY-MM-DD". If the text gives no indication of when the training happened, set "trainedAt" to null (meaning: today, i.e. right now) rather than guessing. Never resolve to a future date — if a weekday reference is ambiguous between this week and last week, assume the most recent past occurrence.
9. Before writing your final answer, re-read the input one more time and count how many distinct transitions it describes. If your "edges" array has fewer entries than that count, you missed one — go back and find it. It is far more common to under-extract (miss a step) than to over-extract, so err on the side of a closer re-read rather than assuming your first pass was complete.
10. Respond with ONLY valid JSON, no markdown fences, matching this exact shape. List "edges" before "nodes" in your response (the transitions are the part most likely to be incomplete, so work them out first):

{
  "edges": [ { "sourceLibraryId": string, "targetLibraryId": string, "label": string, "bidirectional": boolean } ],
  "nodes": [ { "libraryId": string, "label": string, "type": "position" | "submission", "alreadyOnGraph": boolean } ],
  "unrecognized": [ string ],
  "trainedAt": string | null
}

EXAMPLES (library entries abbreviated for illustration only — always use real libraryIds from the LIBRARY section below):

Input: "hit a scissor sweep from closed guard to mount, then armbar"
Output: {"edges":[{"sourceLibraryId":"pos-closed-guard-bottom","targetLibraryId":"pos-mount-top","label":"scissor sweep","bidirectional":false},{"sourceLibraryId":"pos-mount-top","targetLibraryId":"sub-armbar","label":"","bidirectional":false}],"nodes":[{"libraryId":"pos-closed-guard-bottom","label":"Bottom Closed Guard","type":"position","alreadyOnGraph":false},{"libraryId":"pos-mount-top","label":"Top Mount","type":"position","alreadyOnGraph":false},{"libraryId":"sub-armbar","label":"Armbar","type":"submission","alreadyOnGraph":false}],"unrecognized":[],"trainedAt":null}
(Two steps mentioned -> two edges. The second step names no specific technique, so its label is "".)

Input: "worked top side control today, also drilled berimbolo into back mount, then rear naked choke"
Output: {"edges":[{"sourceLibraryId":"pos-de-la-riva","targetLibraryId":"pos-back-mount-top","label":"berimbolo","bidirectional":false},{"sourceLibraryId":"pos-back-mount-top","targetLibraryId":"sub-rear-naked-choke","label":"","bidirectional":false}],"nodes":[{"libraryId":"pos-side-control-top","label":"Top Side Control","type":"position","alreadyOnGraph":false},{"libraryId":"pos-de-la-riva","label":"De La Riva","type":"position","alreadyOnGraph":false},{"libraryId":"pos-back-mount-top","label":"Top Back Mount","type":"position","alreadyOnGraph":false},{"libraryId":"sub-rear-naked-choke","label":"Rear Naked Choke","type":"submission","alreadyOnGraph":false}],"unrecognized":[],"trainedAt":null}
(Two independent things trained: a standalone position with no edge, AND a separate 2-edge chain. Don't force everything into one sequence — "also drilled" signals a new, unconnected thread. Berimbolo is a De La Riva sweep to back mount, not a position itself.)

LIBRARY:
${libraryDump}`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Weekly usage cap — this is the only endpoint in the app that costs
    // real money per call. Increment first (atomic, via the DB function)
    // and reject if that push crossed the limit, rather than
    // read-then-write, so two concurrent requests from the same user
    // can't both read a count under the cap and both proceed.
    if (!user.email || !UNLIMITED_EMAILS.has(user.email)) {
      const { data: newCount, error: usageError } = await supabaseClient.rpc('increment_nlp_usage', {
        p_user_id: user.id,
        p_week_start: currentWeekStart(),
      })
      if (usageError) {
        return new Response(JSON.stringify({ error: `Usage tracking error: ${usageError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (typeof newCount === 'number' && newCount > WEEKLY_PARSE_LIMIT) {
        return new Response(
          JSON.stringify({
            error: `You've used all ${WEEKLY_PARSE_LIMIT} free AI parses for this week. It resets Monday — in the meantime you can still add positions and transitions manually.`,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server missing ANTHROPIC_API_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: RequestBody = await req.json()
    if (!body.text || typeof body.text !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing text' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const library = libraryJson as { positions: LibraryEntry[]; submissions: LibraryEntry[] }

    const systemPrompt = buildSystemPrompt(library.positions, library.submissions)
    const today = new Date()
    const todayIso = today.toISOString().slice(0, 10)
    const weekday = today.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
    const userMessage = `today: ${todayIso} (${weekday})
existingLibraryIds: ${JSON.stringify(body.existingLibraryIds ?? [])}
customEntries: ${JSON.stringify(body.customEntries ?? [])}

${body.text}`

    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        // Was 2048 — a long, detailed session (many techniques/edges, plus
        // the few-shot examples and self-check reasoning this prompt now
        // asks for) can genuinely need more room. Output tokens are cheap
        // and this only caps the ceiling, so there's no cost downside to
        // giving it headroom.
        max_tokens: 4096,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      return new Response(JSON.stringify({ error: `Claude API error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const claudeData = await claudeRes.json()
    const rawText: string = claudeData.content?.[0]?.text ?? '{}'

    let parsed
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText)
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to parse Claude response', raw: rawText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Never trust the model's date output blindly — it's about to be
    // written to the training log. Reject anything that isn't a real
    // YYYY-MM-DD or that lands in the future (backfill only ever goes
    // backward; a bad relative-date resolution should fall back to "now"
    // rather than silently logging a training event that hasn't happened).
    if (typeof parsed.trainedAt === 'string') {
      const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(parsed.trainedAt) && !isNaN(Date.parse(parsed.trainedAt))
      if (!isValidDate || parsed.trainedAt > todayIso) {
        parsed.trainedAt = null
      }
    } else {
      parsed.trainedAt = null
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
