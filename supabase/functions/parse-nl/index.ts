// Supabase Edge Function: parses free-text BJJ training notes into structured
// graph nodes/edges using the Claude API. The Anthropic API key is read from
// Supabase secrets (ANTHROPIC_API_KEY) — never exposed to the client.
//
// Deploy with: supabase functions deploy parse-nl
// Set secret with: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CLAUDE_MODEL = 'claude-sonnet-4-6'
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

function buildSystemPrompt(positions: LibraryEntry[], submissions: LibraryEntry[], existingIds: string[]): string {
  const libraryDump = JSON.stringify({ positions, submissions }, null, 2)

  return `You are a parser that extracts structured BJJ (Brazilian Jiu-Jitsu) training data from free-text descriptions.

You will receive a user's free-text description of what they drilled or learned, plus the full canonical library of positions and submissions.

RULES:
1. Extract every position and submission mentioned in the text.
2. Every extracted position/submission MUST map to an entry in the provided library (match by label or alias, case-insensitive, fuzzy match acceptable). Never invent a libraryId that isn't in the library.
3. Extract every transition described (source -> destination), including chains (e.g. "A to B then B to C" produces two edges).
4. If a term cannot be confidently matched to any library entry, add the raw term to "unrecognized" and do NOT include it in nodes/edges.
5. Mark "alreadyOnGraph": true for any libraryId in this list of node ids already on the user's graph: ${JSON.stringify(existingIds)}
6. Respond with ONLY valid JSON, no markdown fences, matching this exact shape:

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

    const libraryModule = await import('../_shared/library.json', { with: { type: 'json' } })
    const library = libraryModule.default as { positions: LibraryEntry[]; submissions: LibraryEntry[] }

    const systemPrompt = buildSystemPrompt(library.positions, library.submissions, body.existingLibraryIds ?? [])

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
        system: systemPrompt,
        messages: [{ role: 'user', content: body.text }],
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
