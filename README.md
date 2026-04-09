# BD Studio

A planning tool for a French BD (bande dessinée) album. Built for a writer + illustrator collaboration: you write the story, lay it out chapter by chapter on visually accurate album pages, and keep characters and the overall ambiance in one place.

## What it does

- **Chapters** -- Each chapter has a synopsis (the story Jordy wants to tell) and a strict page count of **2, 4, 6, or 8** so chapters always end on a clean break.
- **Pages** -- Every chapter is visualised as a grid of BD album pages at the real French format ratio (21.5 × 29.3 cm). Click any page to open a focused editor and write free-form notes inside the page. `Alt+←` / `Alt+→` jump between pages.
- **Characters** -- A simple catalog with name, role, color accent, and a long-form description for each character.
- **Story & Ambiance** -- Two long-form fields for the overall arc and the visual/tonal direction (mood, references, art notes for the illustrator).
- **Settings** -- Album title, author, illustrator, target total page count (must be a multiple of 8 — BD albums are printed in 8-page signatures), and a color scheme picker for the editor theme.
- **Pages remaining** -- The Chapters view always shows how many pages are left until the album hits its target, with a placeholder "+ N pages remaining" tile after the last chapter.
- **Backup** -- Download the entire project as a JSON file or restore from one.

## Running it

```sh
pnpm install
pnpm dev
```

Opens at `http://localhost:4321`. Data is stored as JSON files in the `data/` directory.

### Subfolder deployment

To serve the app under a subpath (e.g. `https://example.com/bd-studio/`), set `BASE_PATH`:

```sh
BASE_PATH=/bd-studio pnpm build
BASE_PATH=/bd-studio node ./dist/server/entry.mjs
```

All internal links, fetch calls, and assets are prefixed with the base path automatically.
