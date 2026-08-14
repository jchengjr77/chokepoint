# Chokepoint

A personal BJJ knowledge graph. Map the positions, transitions, and submissions
you've learned as a pannable/zoomable node-link diagram. See `app-definition.md`
for the full product spec this app implements.

This is an npm-workspaces monorepo: `packages/web` is the web app
(chokepoint.dev), `packages/shared` holds the platform-agnostic data layer
(Supabase client, auth, graph state, layout/stats logic) that a future React
Native app will also depend on.

## Stack

- React + TypeScript + Vite
- React Flow (graph canvas) + d3-force (auto-layout)
- Tailwind CSS (monospace design system, several selectable themes)
- Supabase (Auth + Postgres + Edge Functions)
- Claude API (natural-language parsing, called server-side from an Edge Function)

## Setup

### 1. Install dependencies

From the repo root (npm workspaces requires installing at the root, not
inside `packages/web`):

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
cp packages/web/.env.example packages/web/.env
```

Fill in `packages/web/.env`:

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
`packages/shared/src/data/library.json` — if you edit the library, update
both copies (or symlink them) and redeploy the function.

Without this step, the app runs fully except for the NL input bar, which will
show an error when submitted.

### 5. Run locally

From the repo root:

```bash
npm run dev
```

This runs `@chokepoint/web`'s dev server. To target a specific workspace
explicitly (useful once `packages/mobile` exists too):

```bash
npm run dev -w @chokepoint/web
```

### 6. Build for production

```bash
npm run build
```

Deploys the `packages/web/dist` output to any static host (Vercel, Netlify,
Cloudflare Pages, etc). No server-side rendering is required — all backend
logic lives in Supabase. The root `vercel.json` points chokepoint.dev's
Vercel project at this build/output path; installs must still run from the
repo root so npm workspaces can link `@chokepoint/shared`.

## Project structure

```
packages/
  web/                             The web app (chokepoint.dev)
    src/
      components/                  UI components
      components/graph/            React Flow canvas, custom node/edge renderers
      lib/supabase.ts              Reads Vite env vars, calls @chokepoint/shared's initSupabase()
      lib/exportImage.ts           html-to-image PNG export (web-only)
      lib/importExport.ts          Graph JSON import/export (web-only)
    vite.config.ts, tailwind.config.js, tsconfig*.json

  shared/                          @chokepoint/shared — platform-agnostic data layer
    src/
      data/library.json            Curated position/submission/transition library (static asset)
      types/                       Shared TypeScript types
      lib/                         Supabase client factory, library helpers, layout algorithm,
                                    training stats, share-card data builder
      hooks/useAuth.tsx            Auth session state
      hooks/useGraphStore.tsx      Graph nodes/edges state + Supabase sync
      hooks/useTrainingLog.tsx     Training log entries
      hooks/useCustomLibrary.tsx   User-defined library entries
      hooks/useNlpUsage.tsx        Weekly NL-parse quota tracking

supabase/
  migrations/0001_init.sql        Schema + RLS policies
  functions/parse-nl/             Edge Function: Claude-backed NL parser
  functions/_shared/library.json  Copy of the library for the edge function runtime
```

`packages/shared` has no browser-only APIs in its core logic (a couple of
narrow exceptions — `window.location.origin` for the OAuth redirect,
`navigator.onLine` for connectivity status — are guarded to degrade safely
when `window`/`navigator` don't exist, e.g. under React Native) so it can be
depended on by a future `packages/mobile` Expo app without a rewrite.

## Notes

- **No offline mode.** If the browser goes offline, mutations are blocked and
  a banner is shown, per the v1 spec.
- **The library is read-only reference data.** Users select from ~40 curated
  positions and ~26 submissions; they cannot create arbitrary nodes.
- **Several selectable themes.** All design tokens live in
  `packages/web/src/index.css` as CSS custom properties; the default theme
  matches the monochrome style guide in `app-definition.md`.
