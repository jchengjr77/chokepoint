# Chokepoint

A personal BJJ knowledge graph. Map the positions, transitions, and submissions
you've learned as a pannable/zoomable node-link diagram. See `app-definition.md`
for the full product spec this app implements.

## Stack

- React + TypeScript + Vite
- React Flow (graph canvas) + d3-force (auto-layout)
- Tailwind CSS (dark theme only, monospace design system)
- Supabase (Auth + Postgres + Edge Functions)
- Claude API (natural-language parsing, called server-side from an Edge Function)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a new project, then:

**Run the schema migration.** In the Supabase SQL editor, run the contents of
`supabase/migrations/0001_init.sql`. This creates `user_preferences`,
`user_nodes`, `user_edges`, and their row-level security policies.

**Enable auth providers.** In Authentication → Providers, email/password is
on by default. To enable "Continue with Google", configure the Google OAuth
provider with your own OAuth client credentials.

**Copy your project's API credentials.** Project Settings → API gives you the
Project URL and `anon` public key.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Deploy the NL-parsing Edge Function

The natural-language input feature ("What did you learn today?") calls Claude
server-side via a Supabase Edge Function, so the Anthropic API key is never
exposed to the browser.

Install the [Supabase CLI](https://supabase.com/docs/guides/cli) if you don't
have it, then:

```bash
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy parse-nl
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

The function reads the bundled library from
`supabase/functions/_shared/library.json`. This is a copy of
`src/data/library.json` — if you edit the library, update both copies (or
symlink them) and redeploy the function.

Without this step, the app runs fully except for the NL input bar, which will
show an error when submitted.

### 5. Run locally

```bash
npm run dev
```

### 6. Build for production

```bash
npm run build
```

Deploy the `dist/` output to any static host (Vercel, Netlify, Cloudflare
Pages, etc). No server-side rendering is required — all backend logic lives
in Supabase.

## Project structure

```
src/
  data/library.json       Curated position/submission/transition library (static asset)
  types/                  Shared TypeScript types
  lib/                    Supabase client, library helpers, layout algorithm, import/export
  hooks/useAuth.tsx        Auth session state
  hooks/useGraphStore.tsx  Graph nodes/edges state + Supabase sync
  components/              UI components
  components/graph/        React Flow canvas, custom node/edge renderers

supabase/
  migrations/0001_init.sql       Schema + RLS policies
  functions/parse-nl/            Edge Function: Claude-backed NL parser
  functions/_shared/library.json Copy of the library for the edge function runtime
```

## Notes

- **No offline mode.** If the browser goes offline, mutations are blocked and
  a banner is shown, per the v1 spec.
- **The library is read-only reference data.** Users select from ~40 curated
  positions and ~26 submissions; they cannot create arbitrary nodes.
- **Dark theme only.** All design tokens live in `src/index.css` as CSS
  custom properties, matching the style guide in `app-definition.md`.
