# List Tool

A browser-only list workbench: paste or import lists, parse them into tables, clean and
transform them, compare lists against each other, and copy or export the result.

Your lists never leave your browser. There is no backend: parsing, tools, compare and
export all run locally, and list content is never sent to an API, analytics or error
reporter. (The site is hosted on GitHub Pages, which — like any host — logs visitor IPs
when the page and its assets are downloaded.)

## Status

All six milestones in `PLAN.md` are built. See `SPEC.md` for what the app is meant to be
and `CLAUDE.md` for the contracts the code follows. The items under SPEC §13 (Web Workers,
table virtualization, PWA caching, JSON import, XLSX export, a Swedish UI) are deliberately
not built, and nothing in the UI pretends otherwise.

What the app does:

- **Import** by paste, file picker or drag and drop, with delimiter detection you can
  override, a live preview, and a list name. `Ctrl/Cmd+V` anywhere opens the import dialog
  with what is on the clipboard.
- **Parsers:** Lines · Delimited · CSV/TSV · Recipients (`Name <email>` lists, as copied
  out of Outlook) · Emails in text.
- **Tools** in five categories, each with the same flow: pick it, configure it, watch the
  live preview and its summary, then Apply or Apply to new list. Undo is always there.
- **Compare** two lists on a column of each, with normalization you control, duplicate
  counts kept, filter chips, and "Create list from…" to turn any part of the result into a
  new list.
- **Export** as lines, a joined line, a quoted list, CSV, TSV, JSON, a PowerShell array, a
  SQL `IN` list, or a Markdown/HTML table, choosing which columns go in. Copy is one click;
  CSV, TSV, JSON and Markdown can be downloaded.
- **Recipes:** save the steps behind a list as a named recipe and replay it on any other
  list. Recipes, settings, favourites and (optionally) the lists themselves are kept in
  this browser between sessions.
- **Keyboard:** `Ctrl/Cmd+K` command palette, `Enter` applies, `Ctrl/Cmd+Z` /
  `Shift+Ctrl/Cmd+Z` undo and redo, `Ctrl/Cmd+C` copies the active list, `Esc` closes.
  The full list is in Settings, not just in this file.
- **Light and dark** following the operating system. Both palettes meet WCAG 2.2 AA, and
  `src/styles/tokens.test.ts` reads the real stylesheet to keep it that way.

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

## How to add a tool, a parser or an exporter

Three steps, always. The shell is generic and is never edited to add one — if it looks
like it needs to be, the contract is wrong and that is what to fix.

1. **One module** in the right folder: `src/tools/<category>/<tool>.ts`,
   `src/parsers/<parser>.ts` or `src/exporters/<exporter>.ts`.
2. **Its test** next to it, `<name>.test.ts`, exercising the pure function directly —
   edge cases, not just the happy path.
3. **One line** in the registry: `src/tools/index.ts`, `src/parsers/index.ts` or
   `src/exporters/index.ts`.

A tool looks like this:

```ts
export const shoutTool: Tool = {
  id: 'shout',                       // kebab-case, never renamed: recipes reference it
  name: en.tools.shout.name,         // every user-facing string comes from i18n/en.ts
  category: 'transform',
  description: en.tools.shout.description,
  keywords: ['shout', 'upper', 'loud'],   // what the picker and palette search
  arity: 'single',                   // 'dual' gets a second list, and a picker for it
  options: [                         // the options form is GENERATED from this
    { key: 'column', label: en.tools.shared.column, type: 'column', default: '', allowAll: true },
  ],
  appliesTo: (input) => input.rows.length > 0,   // optional; hides the tool when it cannot help
  run(input, options) {              // PURE: no I/O, no globals, never mutates the input
    const { rows, changed } = mapCells(input, targetColumns(input, options), (v) => v.toUpperCase());
    return { output: withRows(input, rows), summary: `Shouted ${changed} cells` };
  },
};
```

Things the contract expects:

- `run`, `parse` and `render` are **pure**: same input, same output, no side effects, and
  the input is never mutated.
- Every user-facing string — names, descriptions, option labels, summaries — lives in
  `src/i18n/en.ts`. Components and modules never contain literal UI text.
- Every tool returns a `summary`; the panel and the history show it verbatim.
- Option values arrive as `unknown` (they are serialized into recipes), so read them with
  `stringOption` / `booleanOption` / `numberOption`, which narrow and fall back.
- A `column` option with `allowAll: true` offers "All columns" as an empty value; a
  `columns` option renders a checkbox per column and reads back an array of ids, with no
  value meaning "every column".
- Switching parser, tool or exporter keeps the options the new one declares under the same
  key and type, so a column selection survives a change of format.
- Settings reach options **by key**: a field named `locale`, `numeric`, `nameOrder` or
  `delimiter` is pre-filled from the user's settings without any mapping to maintain.
- Row identity is `row.id`, never the array index. `cell(row, columnId)` returns `''`
  rather than `undefined`.


## Project layout

```
src/
  core/       model, registries, history, store, settings, storage, compare, recipes
  parsers/    raw text  → Dataset        (one module + test + one registry line each)
  tools/      Dataset   → Dataset
  exporters/  Dataset   → text
  shell/      generic UI: layout, tabs, dialogs, panels — never edited to add a
              parser, tool or exporter
  i18n/en.ts  every user-facing string
  styles/     tokens.css (all spacing/colour/type values) + globals.css
  test/       shared fixtures
```
