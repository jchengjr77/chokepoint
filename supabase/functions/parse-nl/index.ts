// Supabase Edge Function: parses free-text BJJ training notes into structured
// graph nodes/edges using the Claude API. The Anthropic API key is read from
// Supabase secrets (ANTHROPIC_API_KEY) — never exposed to the client.
//
// Deploy with: supabase functions deploy parse-nl
// Set secret with: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { createClient } from 'jsr:@supabase/supabase-js@2'
import libraryJson from '../_shared/library.json' with { type: 'json' }

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

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

interface RequestBody {
  text: string
  existingLibraryIds: string[]
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

  return `You are a parser that extracts structured BJJ (Brazilian Jiu-Jitsu) training data from free-text descriptions.

You will receive a user's free-text description of what they drilled or learned, a list of libraryIds already on the user's graph, plus the full canonical library of positions and submissions.

RULES:
1. Extract every position and submission mentioned in the text.
2. Every extracted position/submission MUST map to an entry in the provided library (match by label or alias, case-insensitive, fuzzy match acceptable). Never invent a libraryId that isn't in the library.
3. Extract every transition described (source -> destination), including chains (e.g. "A to B then B to C" produces two edges).
4. Positions and submissions are a closed, curated set — but transitions between them are NOT. There is no fixed list of "known" transitions: two positions in this library can be connected by any technique, and the same pair of positions can be connected in many different ways (different sweeps, passes, escapes, entries). Do not limit yourself to "typical" or "textbook" connections — trust the user's description of what they actually did, even if it's an unusual or uncommon route between two positions.
5. The edge "label" should be a short, natural description of the specific technique the user described (e.g. "berimbolo", "far-side armbar", "russian 2-on-1 to back take") — write it in your own words based on what the user said, don't force it to match any pre-existing phrasing. If the user only said they went from one position/submission to another without naming a specific technique (e.g. "north south to kimura"), leave "label" as an empty string "" rather than inventing or guessing a technique name — do not fabricate a label just to fill the field.
6. If a term cannot be confidently matched to any library entry, add the raw term to "unrecognized" and do NOT include it in nodes/edges.
7. Mark "alreadyOnGraph": true for any libraryId that appears in the "existingLibraryIds" list given in the user message.
8. Respond with ONLY valid JSON, no markdown fences, matching this exact shape:

{
  "nodes": [ { "libraryId": string, "label": string, "type": "position" | "submission", "alreadyOnGraph": boolean } ],
  "edges": [ { "sourceLibraryId": string, "targetLibraryId": string, "label": string, "bidirectional": boolean } ],
  "unrecognized": [ string ]
}

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
    const userMessage = `existingLibraryIds: ${JSON.stringify(body.existingLibraryIds ?? [])}

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
        max_tokens: 2048,
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
