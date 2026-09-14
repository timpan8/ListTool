# List Tool

A browser-only list workbench: paste or import lists, parse them into tables, clean and
transform them, compare lists against each other, and copy or export the result.

Your lists never leave your browser. There is no backend: parsing, tools, compare and
export all run locally, and list content is never sent to an API, analytics or error
reporter. (The site is hosted on GitHub Pages, which — like any host — logs visitor IPs
when the page and its assets are downloaded.)

## Status

Milestone 2 of 6. The workspace works end to end for importing, viewing and exporting
lists; tools, compare mode, the command palette and persistence are still to come. See
`PLAN.md` for the milestone order, `SPEC.md` for what is being built and `CLAUDE.md` for
the contracts the code follows.

What works today:

- **Import** by paste, file picker or drag and drop, with delimiter detection you can
  override, live preview, and a list name.
- **Parsers:** Lines, Delimited, CSV / TSV.
- **View** each list as a table or as its original text, search within the view (which
  never changes the list), and select a column to count on.
- **Re-parse** from the Raw view with different options — an undoable step like any other.
- **Undo / redo** per list, with `Ctrl/Cmd+Z` and `Shift+Ctrl/Cmd+Z`.
- **Tabs:** several lists at once — rename, duplicate, close.
- **Export** as lines, a joined line, a quoted list, CSV or TSV: copy to the clipboard, or
  download CSV and TSV as a file. One-click **Copy** takes the active list as lines.

## Requirements

Node.js 22 and npm. Install dependencies once with `npm ci` (or `npm install`).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload at http://localhost:5173/ListTool/ |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally, exactly as Pages will |
| `npm run typecheck` | `tsc --noEmit` against `src/` and `vite.config.ts` |
| `npm test` | Vitest, single run |

Run `npm run typecheck`, `npm test` and `npm run build` before pushing — the deploy
workflow runs all three and fails the deployment if any of them fails.

## Deployment

Push to `main` → `.github/workflows/deploy.yml` builds and publishes `dist/` to GitHub
Pages at https://timpan8.github.io/ListTool/.

Two things must hold for that to work:

1. **Pages must be enabled.** The workflow does that itself — `configure-pages` runs
   with `enablement: true` — so there is normally nothing to set by hand. If that step
   ever fails with *Get Pages site failed*, enable it manually: Settings → Pages →
   Source = **GitHub Actions**.
2. **`base` matches the repo path.** `vite.config.ts` sets `base: '/ListTool/'`. GitHub
   Pages paths are case-sensitive, so renaming the repository means changing `base` in
   the same commit. A user site or a custom domain would use `base: '/'`.

## Project layout

```
src/
  core/       model, registries, history, store, persistence, compare helpers
  parsers/    raw text  → Dataset        (one module + test + one registry line each)
  tools/      Dataset   → Dataset          (empty until milestone 3)
  exporters/  Dataset   → text
  shell/      generic UI: layout, tabs, dialogs, panels — never edited to add a
              parser, tool or exporter
  i18n/en.ts  every user-facing string
  styles/     tokens.css (all spacing/colour/type values) + globals.css
  test/       shared fixtures
```
