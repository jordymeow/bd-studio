# BD Studio

## What this is

A local-first planning tool for a French BD album. The writer (Jordy) lays out chapters and pages, the illustrator (Dreamy) reads the plan. The visual BD page — at the real album ratio — is the central UX element: writing happens *inside* a representation of the actual page so the album feels real as it's planned.

## Tech stack

- Astro 6 SSR (Node adapter, `output: 'server'`)
- React 19 for interactive components (islands, mounted with `client:load`)
- Tailwind CSS v4 with theme colors via CSS custom properties
- Radix UI primitives (dialog, dropdown-menu, checkbox, color-picker, etc.)
- Lucide icons (`@lucide/astro` for server-rendered, `lucide-react` for islands)
- pnpm (never npm or yarn)
- Data stored as JSON files in `data/` (no database)

## Project structure

- `src/pages/` — Astro pages (SSR) that fetch data and pass to React components
- `src/pages/api/` — REST API endpoints for CRUD operations
- `src/components/` — React feature components
- `src/components/ui/` — Radix-based primitives (button, dialog, input, etc.)
- `src/lib/types.ts` — Shared TypeScript types
- `src/lib/data.ts` — Server-side file I/O (reads/writes JSON in `data/`)
- `src/lib/id.ts` — Safe-for-browser `generateId(prefix)` helper (no node deps)
- `src/lib/color-schemes.ts` — Theme palette definitions
- `src/layouts/Layout.astro` — Main sidebar layout (fetches chapters + settings for nav)
- `data/` — JSON storage (`chapters.json`, `characters.json`, `settings.json`)

## Domain model

### Chapters and pages

- A `Chapter` has a `pageCount: PageCount` where `PageCount = 2 | 4 | 6 | 8`. **This is a literal type — invalid values won't compile**, and the constraint is also enforced server-side via `isValidPageCount` in `src/lib/data.ts`.
- Pages are **embedded inside the chapter JSON**, not separate files. They're tightly coupled, the per-chapter count is small, and the per-album total is small (~72), so this keeps the data layer trivial.
- When `pageCount` changes, `reconcilePages()` in `data.ts` adds blank pages at the end (preserving existing notes) or trims from the end. The UI warns before destructive shrinks.
- The `BookSettings.totalPages` field is the **target** for the album, validated as a positive multiple of 8 (`isValidTotalPages`). The Chapters view shows used/target and a "pages remaining" placeholder.

### Characters

Plain catalog: `id`, `name`, `role`, `description`, `color`. Saved as a single array via PUT to `/api/characters`.

### Settings

`BookSettings` holds title, author, illustrator, story (long-form), ambiance (long-form), `totalPages`, and `colorScheme`. Defaults are merged in via spread on read, so existing settings files automatically pick up new fields.

## Visual BD page (`src/components/BdPage.tsx`)

The single most important component. Two variants:

- `variant="thumb"` — small clickable card on the chapter detail grid, shows truncated notes
- `variant="full"` — large editable page with a textarea filling the page, used in the focused page editor

The aspect ratio is hardcoded to `21.5 / 29.3` (real French BD album dimensions). Colors come from the theme — `bg-surface-light`, `text-text`, `border-border` — so the page reads as a soft "card" in whichever color scheme is active. **Do not switch back to white** — pure white was tested and is too harsh against the dark theme.

## Autosave pattern

All editors (`ChapterDetail`, `PageEditor`, `CharacterManager`, `StoryEditor`, `SettingsPanel`) use the same shape:

1. Local React state holds the current value
2. A `latest` ref mirrors the state (so the debounced `persist` always sees the most recent value, not a stale closure)
3. `scheduleSave` debounces 300–400ms then calls `persist`
4. `persist` PUTs to the API, sets `dirty/saving/saved` flags for the status indicator

`PageEditor` uses a lighter `PUT /api/chapters/page` endpoint to avoid round-tripping the full chapter on every keystroke.

## Subfolder deployment

The app supports being served under a subpath via `BASE_PATH` env var. Pattern copied from `game-the-flight` and the `book-japon-*` projects:

- `astro.config.mjs`: `base: process.env.BASE_PATH || '/'`
- `src/lib/base.ts`: exports `BASE` and `url(path)` helper
- All React components wrap `fetch('/api/...')` and link `href`s in `url(...)`
- `Layout.astro` uses `${base}` prefix on all hrefs and computes `currentPath = Astro.url.pathname.replace(base, '')` for active-state comparisons
- Astro redirects use `Astro.redirect(import.meta.env.BASE_URL)` rather than `'/'`

## Common pitfalls

- **Vite watcher must ignore `data/`** — `astro.config.mjs` sets `vite.server.watch.ignored: ['**/data/**']`. Without this, every autosave writes to `data/*.json`, Vite detects it as a file change, and triggers a full browser reload — which kills focus on the active textarea, making it impossible to type. **Don't remove this.**
- **`generateId` must come from `lib/id.ts`, not `lib/data.ts`** — `data.ts` imports `node:fs` and can't be bundled into client code. Server code can still import `generateId` from `data.ts` (it re-exports from `id.ts`).
- **CSRF on API**: `security: { checkOrigin: false }` is set in `astro.config.mjs`. Without it, DELETE/PUT from the browser get blocked.
- **Existing settings files auto-upgrade** via the `{ ...DEFAULT_SETTINGS, ...read }` spread in `getSettings()`. When adding a new field to `BookSettings`, also add it to `DEFAULT_SETTINGS` so old settings files pick up a sane default on read.
- **Page count validation lives in two places**: client (`PAGE_COUNTS` array drives the UI buttons) and server (`isValidPageCount` rejects invalid values in the API). Both must agree — update both when changing the allowed set.
