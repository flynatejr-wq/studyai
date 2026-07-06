# Guide Library — redesigned "All Guides" — design

Date: 2026-07-06
Status: approved (design), pending implementation

## Problem

Guide organization is capable but scattered and disconnected from studying:

- Search, sort, favorites, and bulk actions live on `All Guides`; folders are a
  separate experience. Browsing means jumping between surfaces.
- A guide's study progress (`section_progress`) doesn't help the user find or
  prioritize it, so half-finished guides get lost and guides just pile up.

## Goal

Turn `All Guides` into a single-screen **Library**: a persistent left filter
rail + the existing guide grid, with progress made visible so "what should I
finish?" is answerable at a glance. Reuse existing concepts (folders,
favorites, source `type`, `section_progress`) — introduce no new user concepts.

Non-goals: tags, nested folders, spaced-repetition scheduling. (Deferred.)

## UX

Two panes inside the existing page.

### Left rail (new)

- **Status** — All · In progress · Completed · Not started · Favorites. Each row
  shows a live count. Single-select; "All" clears the status filter.
- **Folders** — existing folders with their color + a per-folder count; click to
  filter. Includes "No folder". "New folder" reuses the current create flow.
- **Type** — Text · YouTube · PDF/File · Image · Audio. Multi-select chips.

On mobile the rail collapses into a "Filters" button that opens a drawer (reuse
the existing sidebar drawer pattern). Chosen over a chip bar so folders + status
+ type all fit without horizontal scrolling.

### Right pane (mostly existing)

- Search + sort stay as-is.
- Guide cards gain: a small **progress ring** (percent of sections complete), a
  **folder chip** (color dot + name), the existing **type badge**, and the
  **favorite star**.
- Bulk select / move / delete stay.

Active filters combine (AND): e.g. Folder "Biology 101" + Status "In progress" +
Type "PDF" + search text.

## Data model

Status filtering and accurate counts need progress queryable in SQL.
`section_progress` is stored as a JSON `TEXT` column — awkward and slow to filter
on. Add two derived integer columns, kept in sync:

- `guides.sections_total INTEGER DEFAULT 0`
- `guides.sections_done  INTEGER DEFAULT 0`

Status is derived:

- not started: `sections_done = 0`
- completed:   `sections_total > 0 AND sections_done = sections_total`
- in progress: `sections_done > 0 AND sections_done < sections_total`

Kept in sync at:

- guide creation/save (from the generated `sections` length; done = 0)
- `PATCH /guides/:id/section-progress` (recompute total + done from the payload)

Backfill (idempotent, in `initDb`): for existing rows, parse `sections` and
`section_progress` once to populate the two columns.

Index: `CREATE INDEX idx_guides_user_status ON guides(user_id, sections_done, sections_total)`.

## API

Extend the guide list endpoint (`GET /api/guides`, used by `listPaged`) with
optional query params, all AND-combined, scoped to the authenticated user:

- `folder_id` — exact match (existing single-folder filter, generalized)
- `type` — one of the source types
- `status` — `in_progress | completed | not_started | favorites`
- `search`, `limit`, `offset` — existing

Add a facets endpoint for the rail counts so the numbers stay correct
independent of pagination:

- `GET /api/guides/facets` → `{ total, byStatus: {all, in_progress, completed, not_started, favorites}, byType: {...}, byFolder: [{folder_id, count}] }`
  Counts respect the *other* active filters is out of scope for v1 — v1 returns
  global counts per facet (simpler; revisit if it feels wrong).

`api.js`: `listPaged` gains a `filters` arg; add `guides.facets()`.

## Components

- `client/src/pages/AllGuides.jsx` — becomes the Library. Holds filter state
  (status, folderId, types[]), passes it to `listPaged`, renders the rail + grid.
- `LibraryRail` (new, in-file or `components/`) — pure presentational: takes
  facets + active filters + onChange callbacks. No data fetching.
- `GuideCard` progress ring — small self-contained SVG (percent from
  `sections_done`/`sections_total`). Reused by the dashboard "Continue Studying"
  cards if convenient (not required).
- Folder create/delete: reuse existing handlers. `FolderView` stays as-is for v1
  (least churn, existing `/folder/:id` links keep working); rail folder clicks
  filter the Library in place rather than navigating away.

## Error handling

- Facets fetch failure: rail still renders, counts show as blank/– (non-blocking).
- List fetch failure: existing toast + empty state.
- Filters that match nothing: existing empty state, with a "Clear filters" action.

## Testing

- Backend: status-derivation SQL (unit or via the list endpoint) — not started /
  in progress / completed / favorites return the right guides; facet counts sum
  correctly. (Server tests need a DB; may only run in CI.)
- Frontend: `LibraryRail` renders counts and fires onChange; progress ring maps
  percent to stroke correctly (0/partial/100). Existing Vitest setup.

## Rollout

Frontend + backend ship together (both branches). No feature flag. Verify on the
Vercel/Render deploy (dashboard is auth-gated; can't verify locally).
