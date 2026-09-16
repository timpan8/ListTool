# List Tool

A browser-only list workbench: paste or import lists, parse them into tables, clean and
transform them, compare lists against each other, and copy or export the result.

Your lists never leave your browser. There is no backend: parsing, tools, compare and
export all run locally, and list content is never sent to an API, analytics or error
reporter. (The site is hosted on GitHub Pages, which — like any host — logs visitor IPs
when the page and its assets are downloaded.)

## Status

All six milestones in `PLAN.md` are built, plus the M7 and M8 rounds of improvements it
lists. M9, the quality overhaul, is in progress phase by phase.
See `SPEC.md` for what the app is meant to be and `CLAUDE.md` for the contracts the code
follows. The items under SPEC §13 (Web Workers, table virtualization, PWA caching, XLSX
export, a Swedish UI) are deliberately not built, and nothing in the UI pretends
otherwise.

What the app does:

- **Import** by paste, file picker or drag and drop, with delimiter detection you can
  override, a live preview, and a list name. `Ctrl/Cmd+V` anywhere opens the import dialog
  with what is on the clipboard.
- **Parsers:** Lines · Delimited · CSV/TSV · HTML table (what a copy out of Excel, Word or
  a web page actually puts on the clipboard) · JSON · Recipients (`Name <email>` lists, as
  copied out of Outlook) · Emails in text.
- **Tools** in five categories, each with the same flow: pick it, configure it, watch the
  live preview and its summary, then Apply or Apply to new list. Undo is always there. The
  preview marks the cells, rows and columns the tool would change. Among them: normalise
  dates, numbers and phone numbers written six different ways; validate Swedish ID
  numbers; fill down; pad or cut to length; column maths (rank, running total, share);
  extract pattern with a column per capture group; sort as text, numbers or dates; find
  near-duplicates; cross-tab, group and count. Every tool that matches values offers the
  same four rules in the same order: trim, ignore case, collapse whitespace, ignore
  diacritics.
- **Only the ticked rows:** tick rows and any tool offers to run on just those. Its work
  is merged back by row id — a sort reorders within the ticked slots, a filter removes
  only ticked rows — and the step says which rows it ran on. A tool that reshapes its
  rows, like Count values, can only send that result to a new list, and says so.
- **Worth a look:** the tool picker leads with what the tools would find in the list as it
  stands — "27 duplicates", "3 addresses look malformed", "the first row looks like
  column names", "12 phone numbers are written more than one way", "2 columns are empty"
  — with the tool that fixes each one already configured behind it. Nothing is changed by
  asking.
- **Work in the table:** click a header to sort the view (and make that order permanent
  in one click), open the ▾ beside any column to filter it, rename, move or remove it, or
  see the tools that take it. Click a cell to change it; the arrow keys move between
  cells. Tick rows and the strip above the table offers what can be done to just those.
  Everything that changes the list goes through an ordinary tool, so everything undoes.
  Numbers sit on the right, a long list shows its first 500 rows until asked for more,
  and a tool's preview leads with the rows it would change.
- **Columns tab:** what is actually in each column — filled, empty, distinct, lengths and
  the commonest values. Click a value to show only its rows. Like the search box it
  narrows the view and never the list.
- **Compare** two lists, called by their names throughout: one row per key with both
  lists' columns side by side, the cells that differ marked, "Only in Kunder" / "Only in
  Leads" as statuses, chips and "Create list from…" buttons, and Copy what is shown for
  the table as it stands. Match on one or several columns of each list, with the matching
  rules you choose; duplicate counts are kept. Every tool that takes a second list names
  both lists in its form, and a recipe replays such a step when the second list is open.
  Join lists brings columns across; Mark what is in another list answers the same
  question for three lists or thirty.
- **Export** as lines, a joined line, a quoted list, CSV, TSV, JSON, a PowerShell array, a
  SQL `IN` list, a Markdown/HTML table, or your own template, choosing which columns go in.
  Copy is one click and takes what is on screen — the ticked rows if any, else the rows
  the search shows — with every column, as a real table beside the text, so a paste into
  Excel or Word lands in cells. The export dialog offers the shown, ticked or all rows and
  remembers the last format. The Recipients exporter is the way back into Outlook.
- **Recipes:** save the steps behind a list as a named recipe and replay it on any other
  list. Recipes, settings, favourites and (optionally) the lists themselves are kept in
  this browser between sessions, and the whole workspace can be saved to a file and opened
  again — on another computer, or as a backup.
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
| `npm run typecheck` | `tsc --noEmit` against `src/`, `e2e/` and the config files |
| `npm test` | Vitest, single run |
| `npm run e2e` | The Chromium suite in `e2e/`, against a dev server it starts itself |

Run `npm run typecheck`, `npm test`, `npm run build` and `npm run e2e` before pushing —
CI runs all four on every pull request, and the deploy workflow runs them again before
anything reaches Pages.

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
  value meaning "every column". Either can add `from: 'second'`, and a dual tool then gets
  the SECOND list's columns to choose from instead of its own.
- A `column` option with `allowNone: true` offers "None", for a field that is genuinely
  optional — a second sort key, a tie-breaker.
- A tool can add `check(input)`: what it would find in the list as it stands, as a count
  and a line of text, plus the options to open it with. It turns up under "Worth a look"
  in the picker. Return `null` when there is nothing to report, and keep it as pure and as
  cheap as `run` — it is called for every tool on every render of the picker.
- A `rows` option is filled from the ticks in the table — there is no way to pick rows in a
  form — and reads back an array of row ids. Declare one and the selection arrives; the
  shell never learns the tool's name.
- A tool can return `extraLists`, and the shell opens each as a further tab. Splitting one
  list into batches is a single action to the person doing it, so it stays a single tool.
- An exporter can add `html(dataset, options)` when its output is table-shaped. Copy then
  puts that on the clipboard beside the text, and a paste into Excel lands in cells.
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
