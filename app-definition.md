# Chokepoint — App Definition

## Overview

Chokepoint is a personal BJJ knowledge graph that lets practitioners map positions and transitions they've learned, visualized as a pannable/zoomable 2D node-link diagram. Submissions sit on the periphery as terminal nodes. Users build their graph by selecting from a curated library of positions and submissions — not by defining arbitrary names — and connecting them as they learn transitions. A reach feature allows natural language input to auto-populate the graph.

The app supports cross-device usage (phone + desktop) with user accounts and cloud sync.

---

## Core Concepts

### Node Types

| Type | Description | Visual Treatment |
|------|-------------|-----------------|
| **Position** | A control position (e.g., closed guard, mount, side control, half guard, back control) | Rounded rectangle, filled with a primary color. |
| **Submission** | A finishing hold (e.g., RNC, armbar, triangle, kimura) | Distinct shape (hexagon or star-burst). Accent/danger color. Always positioned on the outer ring of the graph layout. |

Each node on a user's graph stores:
- `id` — unique identifier
- `libraryId` — reference to the canonical library entry
- `type` — `"position"` or `"submission"`
- `label` — display name (from library)
- `notes` — optional free-text (user's personal notes, details, tips)
- `x`, `y` — canvas coordinates (user-adjustable)
- `dateAdded` — timestamp

### Edge Types

| Type | Description | Visual Treatment |
|------|-------------|-----------------|
| **Transition** | A move from one position to another (e.g., guard → mount via sweep) | Directed arrow, solid line. |
| **Submission Entry** | A move from a position into a submission (e.g., mount → armbar) | Directed arrow, dashed line, colored to match submission accent. |

Each edge stores:
- `id` — unique identifier
- `sourceId` — origin node
- `targetId` — destination node
- `label` — optional technique name (e.g., "scissor sweep", "hip escape")
- `bidirectional` — boolean; some transitions go both ways (e.g., guard ↔ half guard)
- `notes` — optional free-text
- `dateAdded` — timestamp

---

## Position & Submission Library

### Source

The library is derived from the [GrappleMap](https://github.com/Eelis/GrappleMap) project (public domain), which contains ~919 entries with hundreds of micro-variations. These have been manually aggregated into canonical positions and submissions suitable for Chokepoint.

### Library File

The curated library is provided as `library.json`, bundled as a static asset with the app. It contains:

- **40 canonical positions** organized by category (standing, guard, top, neutral)
- **26 canonical submissions** (chokes, joint locks, leg locks, cranks)
- **57 known transitions** (common position→position and position→submission connections)

Each position/submission entry includes an `id`, `label`, `aliases` (for NL matching and search), `tags` (from GrappleMap's taxonomy), and a `rulesets` array indicating applicability: `["gi", "nogi"]` for both, `["gi"]` for gi-only, or `["nogi"]` for nogi-only. Examples: Spider Guard and Lasso Guard are gi-only (require sleeve grips). Heel Hook is nogi-only (illegal under standard gi rulesets). Most entries are both.

The library picker should display the ruleset as a subtle badge on each entry (e.g., a small "GI" or "NOGI" tag). Users can optionally filter the picker by ruleset. Each known transition includes `sourceId`, `targetId`, and a `label`.

The `knownTransitions` array serves two purposes: it pre-populates suggested edges when users add connected nodes, and it helps the NL parser infer likely connections. Users can always create edges that aren't in the known transitions list — the list is suggestive, not exhaustive.

**Ship this JSON as a static asset** bundled with the app. It is read-only reference data, not user data.

### User Interaction with the Library

- **Users cannot create arbitrary positions or submissions.** They select from the library.
- **Add Node flow:** User clicks "Add Node" → sees a searchable/filterable list of library entries (positions tab, submissions tab) → selects one → it's added to their graph.
- **NL input** also matches against the library (see NL section below).
- **If a position/submission is missing from the library**, the user cannot add it in v1. Future versions may allow user-submitted additions pending review.

---

## Graph Layout Rules

1. **Submissions on the periphery.** When the graph auto-layouts or when a submission is added, it should be placed at the outer edge of the graph, radiating outward from the position(s) it connects to. Submissions are conceptually "endpoints" — users work toward them.
2. **Positions cluster in the center.** Core positional nodes (guard, mount, side control, back, turtle, etc.) form the dense interior of the graph.
3. **User override.** Users can drag any node to reposition it. Manual placement is persisted and takes priority over auto-layout.
4. **New nodes placed near context.** When a new node is created (manually or via NL), place it near the node it's being connected to, not at a random location.

---

## User Interactions

### Canvas

- **Pan** — click-and-drag on empty canvas (or two-finger drag on mobile)
- **Zoom** — scroll wheel / pinch
- **Minimap** — small overview in bottom-right corner showing full graph extent and current viewport

### Nodes

- **Add node** — button or keyboard shortcut opens a searchable library picker (not a free-text input). User searches/browses positions and submissions, selects one, and it's added to their graph at the center of the current viewport.
- **Select node** — click to select. Shows detail panel (sidebar or bottom sheet on mobile) with name, type, notes, list of connected edges, date added.
- **Edit node** — from detail panel: edit notes only. Name and type are fixed by the library.
- **Delete node** — from detail panel, with confirmation. Deletes all connected edges.
- **Drag node** — click-and-drag to reposition on canvas.

### Edges

- **Add edge** — select source node, then click "Connect" and click destination node. Prompts for optional technique label and directionality.
- **Select edge** — click the edge arrow. Shows label, direction, notes.
- **Edit edge** — rename, toggle bidirectional, edit notes.
- **Delete edge** — from detail panel, with confirmation.

### Toolbar / Controls

- **Ruleset Toggle** — a segmented control with three states: **All**, **Gi**, **Nogi**. Defaults to All. When set to Gi or Nogi, nodes on the graph that don't match the selected ruleset are visually dimmed (reduced opacity, desaturated) but not hidden — the user's graph structure stays intact. The library picker also filters to only show entries matching the active ruleset. The toggle state is persisted per user.
- **Add Node** button (opens library picker, filtered by active ruleset)
- **Natural Language Input** (text field, always visible or toggle-able — see NL section below)
- **Reset View** — re-centers and fits entire graph in viewport
- **Auto-Layout** — re-runs force-directed layout (respects submission-periphery rule), with confirmation since it overrides manual placements
- **Search** — filter/highlight nodes by name

---

## Natural Language Input (Reach Feature)

### UX

A persistent text input (or expandable bottom bar) with placeholder: *"What did you learn today?"*

User types free-form descriptions of what they drilled. Examples:

- "Today I drilled the far-side armbar from side control"
- "Learned scissor sweep from closed guard to mount"
- "We worked on taking the back from turtle, then finishing with an RNC"
- "Practiced x-guard entries from half guard and a sweep to top side control"

### Behavior

1. **Parse the input** using an LLM (Claude API) to extract structured data:
   - Positions mentioned (normalized to library canonical names)
   - Submissions mentioned (normalized to library canonical names)
   - Transitions described (source → destination, with technique name if given)
   - Multiple transitions in a single input should all be captured (chain detection)

2. **Match against the library:**
   - The LLM prompt includes the full list of library positions/submissions with aliases.
   - Every extracted position/submission must map to a library entry. If the LLM can't match, it flags it as unrecognized and the preview shows a warning.
   - If the matched node already exists on the user's graph, reuse it. If not, it will be added.

3. **Preview before committing:**
   - Show the user a summary of what will be added: "Add 2 nodes (X-Guard, Armbar) and 3 transitions (Half Guard → X-Guard, X-Guard → Side Control, Mount → Armbar). Confirm?"
   - User can accept all, deselect individual items, or cancel.
   - Unrecognized terms are shown with a warning icon and excluded by default.

4. **Apply changes** — new nodes placed near connected existing nodes; new edges drawn.

### LLM Prompt Design

The system prompt for the NL parser should:
- Receive the user's free-text input AND the full library JSON (positions + submissions with aliases)
- Return structured JSON:

```json
{
  "nodes": [
    { "libraryId": "pos-side-control", "label": "Side Control", "type": "position", "alreadyOnGraph": false },
    { "libraryId": "sub-armbar", "label": "Armbar", "type": "submission", "alreadyOnGraph": true }
  ],
  "edges": [
    {
      "sourceLibraryId": "pos-side-control",
      "targetLibraryId": "sub-armbar",
      "label": "far-side armbar",
      "bidirectional": false
    }
  ],
  "unrecognized": ["far-side"] 
}
```

- Handle ambiguity gracefully: if unsure which library entry matches, return top candidates and flag for user review.

---

## Authentication & Data Model

### Auth

- **Supabase Auth** — email/password and OAuth (Google at minimum).
- Simple signup/login flow. No email verification required for v1 (optional improvement).
- Auth state persisted in the client; Supabase handles session tokens.

### Data Storage

All user graph data is stored in **Supabase Postgres** for cross-device sync. The library JSON is a static asset bundled with the app (not in the database).

### Database Schema (Supabase)

```sql
-- Users (managed by Supabase Auth, no custom table needed for v1)

-- User preferences
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ruleset_filter TEXT NOT NULL DEFAULT 'all' CHECK (ruleset_filter IN ('all', 'gi', 'nogi')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User's graph nodes
CREATE TABLE user_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  library_id TEXT NOT NULL,           -- reference to static library entry
  type TEXT NOT NULL CHECK (type IN ('position', 'submission')),
  label TEXT NOT NULL,
  notes TEXT DEFAULT '',
  x FLOAT NOT NULL DEFAULT 0,
  y FLOAT NOT NULL DEFAULT 0,
  date_added TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, library_id)        -- a user can only have one instance of each library entry
);

-- User's graph edges
CREATE TABLE user_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID REFERENCES user_nodes(id) ON DELETE CASCADE,
  target_id UUID REFERENCES user_nodes(id) ON DELETE CASCADE,
  label TEXT DEFAULT '',
  bidirectional BOOLEAN DEFAULT FALSE,
  notes TEXT DEFAULT '',
  date_added TIMESTAMPTZ DEFAULT now()
);

-- Row-level security: users can only access their own data
ALTER TABLE user_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own nodes"
  ON user_nodes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD their own edges"
  ON user_edges FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can CRUD their own preferences"
  ON user_preferences FOR ALL USING (auth.uid() = user_id);
```

### Sync Strategy

- **Supabase client SDK** handles real-time reads/writes.
- On app load: fetch all user nodes and edges from Supabase.
- On mutation (add/move/delete node or edge): write to Supabase immediately.
- No offline mode for v1. If offline, show a banner and block mutations. Future versions can add optimistic updates with conflict resolution.

### Import / Export

- **Export** — download graph as JSON file (full schema dump, excluding user_id)
- **Import** — upload a JSON file to restore/merge a graph (validates library_ids against the bundled library)

---

## Tech Recommendations

These are suggestions for the implementing agent, not hard requirements:

- **Framework:** React (single-page app), deployable as a responsive web app
- **Backend/Auth/DB:** Supabase (Auth + Postgres + client SDK)
- **Graph rendering:** Use a canvas-based or SVG-based graph library. Good options:
  - **React Flow** — mature, supports custom nodes/edges, pan/zoom/minimap built in, good DX
  - **D3-force** with custom React rendering — more control, more work
  - **Cytoscape.js** — powerful graph library, less React-idiomatic
- **NL parsing:** Anthropic Claude API (claude-sonnet-4-6). Call via a Supabase Edge Function (not client-side) to protect the API key.
- **Layout algorithm:** Force-directed (e.g., d3-force) with a custom radial constraint that pushes submission-type nodes outward.
- **Styling:** CSS modules or Tailwind CSS. Dark theme only (no light mode). Use CSS custom properties for all color/typography tokens as defined in the Style Guide. Load JetBrains Mono from Google Fonts as the primary typeface.
- **Library data:** The curated `library.json` is provided and should be placed at `/src/data/library.json` (or equivalent). No ETL script is needed.

## Style Guide

### Philosophy

Chokepoint looks like a tool built by engineers for engineers. Minimal chrome, high information density, no decorative elements. The aesthetic is closer to a terminal or a code editor than a consumer app. Everything is black, white, and gray — color is used only for functional meaning (submission nodes, active states, errors).

### Colors

```
--bg-primary:       #000000    /* app background */
--bg-surface:       #111111    /* panels, modals, cards */
--bg-elevated:      #1A1A1A    /* hover states, tooltips */
--border:           #333333    /* all borders, dividers */
--border-focus:     #666666    /* focused inputs, selected nodes */

--text-primary:     #FFFFFF    /* headings, node labels */
--text-secondary:   #999999    /* metadata, timestamps, tags */
--text-tertiary:    #555555    /* placeholders, disabled */

--node-position:    #FFFFFF    /* position node stroke/fill */
--node-submission:  #00CC66    /* submission node accent — the only color */
--edge-default:     #444444    /* transition arrows */
--edge-submission:  #00CC66    /* submission entry arrows (dashed) */

--dimmed:           0.25       /* opacity for nodes filtered out by ruleset toggle */
```

The single accent color (green for submissions) is the only departure from the monochrome palette. It draws the eye to the "goal" nodes on the periphery.

### Typography

All text uses a monospace font stack. No sans-serif, no serif, no display fonts.

```
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
```

| Element             | Size   | Weight | Case       |
|---------------------|--------|--------|------------|
| App title           | 14px   | 700    | UPPERCASE  |
| Node labels         | 12px   | 500    | Normal     |
| Edge labels         | 10px   | 400    | Normal     |
| Panel headings      | 13px   | 600    | UPPERCASE  |
| Panel body text     | 12px   | 400    | Normal     |
| Toolbar buttons     | 11px   | 500    | UPPERCASE  |
| Ruleset toggle      | 11px   | 500    | UPPERCASE  |
| Input fields        | 12px   | 400    | Normal     |
| Badges (GI / NOGI)  | 9px    | 600    | UPPERCASE  |

### Node Rendering

- **Position nodes:** Rectangular with sharp corners (no border-radius). 1px white border, transparent fill. Label centered inside. On hover: fill becomes `--bg-elevated`. On select: border becomes 2px.
- **Submission nodes:** Same rectangle but with a 1px green border and a small green dot or triangle marker in the corner. No filled background.
- **Dimmed nodes** (filtered by ruleset): Same shape, but opacity reduced to `--dimmed`. Non-interactive until the filter is changed.

### Edge Rendering

- **Transitions:** 1px solid line in `--edge-default`, with a small arrowhead at the target. Bidirectional edges get arrowheads on both ends.
- **Submission entries:** 1px dashed line in `--edge-submission`.
- **On hover:** Edge thickens to 2px and label appears (if not already shown).

### Panels & Modals

- All panels have `--bg-surface` background, `--border` border, no border-radius, no box-shadow.
- Modal overlays use a semi-transparent black backdrop (`rgba(0,0,0,0.7)`).
- Inputs: transparent background, bottom-border only (underline style), monospace text.
- Buttons: outlined (1px border, transparent fill). On hover: fill becomes `--bg-elevated`. Primary actions use white fill with black text.

### Library Picker

- Flat list, no cards. Each entry is a single row: `[label]  [GI] [NOGI]` with badges as small bordered pills.
- Selected entries get a `>` prefix or a subtle left-border highlight.
- Search input at the top, same underline style as other inputs.

### Ruleset Toggle

- Segmented control with three segments: `ALL` | `GI` | `NOGI`.
- Active segment: white text on white-bordered background. Inactive: `--text-secondary` with no border fill.

### Minimap

- Bottom-right corner, small (120×80px), `--bg-surface` background.
- Shows node positions as tiny dots (white for positions, green for submissions).
- Viewport rectangle outlined in `--border-focus`.

### Responsive

- Desktop: side panel slides in from the right for node/edge details.
- Mobile: detail panel slides up from the bottom as a half-sheet. Library picker is full-screen. Minimap is hidden on screens under 640px.

### Motion

- Minimal transitions. Node drag is immediate (no easing). Panel open/close: 150ms ease-out. No bounces, no spring physics, no fade-ins on load.

---

```
┌──────────────────────────────────────────────────┐
│  [Logo/Title] [All|Gi|Nogi] [Search] [Add Node] [User]│  ← Top bar
├──────────────────────────────────────────────────┤
│                                                  │
│                                                  │
│              Graph Canvas                        │
│         (pan, zoom, drag nodes)                  │
│                                                  │
│                                         ┌──────┐ │
│                                         │Mini- │ │
│                                         │ map  │ │
│                                         └──────┘ │
├──────────────────────────────────────────────────┤
│  💬 "What did you learn today?"          [Send]  │  ← NL input bar
└──────────────────────────────────────────────────┘

Side panel (slides in on node/edge selection):
┌────────────┐
│ Node Name  │
│ Type: ...  │
│ Notes: ... │
│ Connected: │
│  → Node A  │
│  → Node B  │
│ [Edit]     │
│ [Delete]   │
└────────────┘

Library Picker (modal, opened by "Add Node"):
┌────────────────────────────┐
│  🔍 Search positions...    │
│  [Positions] [Submissions] │  ← tabs
│                            │
│  ☐ Closed Guard            │
│  ☐ Open Guard              │
│  ☐ Half Guard              │
│  ☐ Deep Half Guard         │
│  ☐ Butterfly Guard         │
│  ...                       │
│                            │
│  [Add Selected]  [Cancel]  │
└────────────────────────────┘

Login/Signup (shown before main app):
┌────────────────────────────┐
│  CHOKEPOINT                │
│                            │
│  [Continue with Google]    │
│  ── or ──                  │
│  Email: [____________]     │
│  Password: [__________]    │
│  [Log In]   [Sign Up]     │
└────────────────────────────┘
```

---

## Starter Content

On first login (new user), the graph starts empty. The library picker is immediately available so users can add their first positions. A brief onboarding tooltip or overlay should explain:

1. "Add positions you know from the library"
2. "Connect them with transitions you've learned"
3. "Submissions go on the edges — they're your goals"

No pre-seeded graph. The value of Chokepoint is that it reflects *your* knowledge, not a generic template.

---

## Out of Scope for v1

- User-submitted library additions (custom positions/submissions)
- Video/media attachments on nodes
- Technique drilling / spaced repetition
- Belt/rank progression tracking
- Mobile native app (responsive web is sufficient)
- Offline mode / optimistic sync
- Social features (sharing graphs, comparing with training partners)
