# List Tool — Instructions for Claude Code

## What this is
List Tool is a browser-only **list workbench**: paste or import lists, parse them into
tables, clean and transform them, compare lists against each other, and copy/export the
result. It is a static site on GitHub Pages. There is no backend, and list data never
leaves the browser.

Read `SPEC.md` (what to build) and `PLAN.md` (in what order) before writing code.

## Fixed stack — do not change
- Preact + TypeScript (`strict: true`) + Vite, npm.
- State: `@preact/signals`. No Redux / Zustand / MobX.
- CSV/TSV parsing: `papaparse`. Everything else is hand-written.
- Tests: Vitest. (Playwright only if PLAN.md schedules it.)
- Deploy: GitHub Actions → GitHub Pages. Vite `base` must match the repo path.
- Persistence: localStorage, one key, JSON. Move to IndexedDB only if lists outgrow it.
- Allowed runtime deps: `preact`, `@preact/signals`, `papaparse`.
  Allowed dev deps: `vite`, `@preact/preset-vite`, `typescript`, `vitest`,
  `@types/papaparse`. Anything else needs a one-line justification in the commit
  message. Never load anything from a CDN at runtime. No external fonts.

## The one rule that matters most
The shell (layout, dataset tabs, tool picker, command palette, options panel, result
panel, compare mode) is **generic** and driven by three typed registries:
**parsers, tools, exporters**. Adding a parser, tool, or exporter means adding one module,
its test, and one registry line. The shell is never edited for it.

If adding a feature seems to require a new permanent button or a special case in the
shell, the design is wrong — stop and fix the contract instead.

## Core model
```ts
// src/core/model.ts
export interface Column { id: string; name: string }
// id is stable and, when the parser knows the meaning, deterministic:
// 'first' | 'last' | 'email' | 'original' | 'value' | 'c1', 'c2', …
// Recipes and tool options reference columns by id, so ids must survive re-parsing.

export interface Row { id: string; cells: Record<string, string> } // keyed by Column.id

export interface Dataset {
  id: string;
  name: string;
  columns: Column[];
  rows: Row[];
  rawInput?: string;                                       // original paste/file text — kept so the user can re-parse
  parse?: { parserId: string; options: Record<string, unknown> };
}
// A plain one-column list is a Dataset with one column (id 'value').
// There is no separate "simple list" type — ever.
```

## Registry contracts
```ts
// src/core/registry.ts
export type Options = Record<string, unknown>;

export type OptionField =
  | { key: string; label: string; type: 'text' | 'number'; default: string | number; help?: string }
  | { key: string; label: string; type: 'boolean';   default: boolean; help?: string }
  | { key: string; label: string; type: 'select';    default: string; choices: { value: string; label: string }[]; help?: string }
  | { key: string; label: string; type: 'column';    default?: string; help?: string }   // dropdown of the input dataset's columns → column id
  | { key: string; label: string; type: 'delimiter'; default: string; help?: string };  // presets (newline , ; tab | space) + custom

export interface ToolResult {
  output: Dataset;
  summary: string;                 // human-readable: "Removed 27 duplicates (815 → 788 rows)"
  stats?: Record<string, number>;
  warnings?: string[];
}

export interface Tool {
  id: string;                      // kebab-case, never renamed (recipes reference it)
  name: string;
  category: 'clean' | 'transform' | 'columns' | 'extract' | 'compare';
  description: string;             // one line
  keywords: string[];              // search terms for picker / palette
  arity: 'single' | 'dual';        // dual tools receive a second dataset
  options: OptionField[];          // the options panel is GENERATED from this — never hand-built
  appliesTo?(input: Dataset, second?: Dataset): boolean; // e.g. needs ≥ 2 columns; default true
  run(input: Dataset, options: Options, second?: Dataset): ToolResult; // PURE
}

export interface Parser {
  id: string; name: string; description: string;
  options: OptionField[];
  detect(input: string): { confidence: number; options: Options } | null; // advisory — user can override
  parse(input: string, options: Options): Dataset;                        // PURE
}

export interface Exporter {
  id: string; name: string;
  extension?: string;              // undefined = clipboard text only
  options: OptionField[];
  render(dataset: Dataset, options: Options): string; // PURE — the shell does copy/download
}
```
Registries are plain arrays: `src/parsers/index.ts`, `src/tools/index.ts`,
`src/exporters/index.ts`. No dynamic loading, no reflection, no plugin marketplace.

## History
```ts
// src/core/history.ts — one history per dataset
export interface Step         { toolId: string; options: Options; summary: string; at: number }
export interface HistoryEntry { step: Step; snapshot: Dataset } // dataset AFTER the step
```
Undo restores the previous snapshot; redo the next. Steps are serializable, which is what
makes saved recipes (SPEC §8) a small feature later instead of a rewrite.

## Folder structure
```
src/
  core/       model.ts registry.ts history.ts store.ts storage.ts
              detect.ts normalize.ts sort.ts stats.ts compare.ts
  parsers/    lines.ts delimited.ts csv.ts recipients.ts emails-in-text.ts index.ts
  tools/      <category>/<tool>.ts + <tool>.test.ts     index.ts
  exporters/  lines.ts csv.ts tsv.ts json.ts powershell.ts sql-in.ts
              markdown.ts quoted-join.ts joined-line.ts  index.ts
  shell/      App.tsx Layout.tsx DatasetTabs.tsx DatasetView.tsx StatusBar.tsx
              ImportDialog.tsx ToolPicker.tsx CommandPalette.tsx OptionsPanel.tsx
              ResultPanel.tsx CompareMode.tsx ExportDialog.tsx Settings.tsx
  i18n/       en.ts sv.ts  (ALL user-facing strings, one file per language; components never
              index.ts     contain literal UI text and read `ui` from i18n/index.ts, never `en`)
  styles/     tokens.css globals.css
  test/       fixtures.ts
```
Dependency direction: `shell → core/parsers/tools/exporters → model`. Never the reverse.
No list logic inside components.

## Conventions
- Strict TypeScript. No `any` — use `unknown` and narrow.
- All `parse`, `run`, `render`, `compare` functions are pure: no I/O, no globals,
  deterministic, never mutate input.
- Row identity is the `id`, never the array index.
- Normalization (trim, case, diacritics) is used to build **keys** for dedupe/compare.
  Displayed values are never overwritten by normalization.
- Every tool returns a `summary`; the result panel and history show it verbatim.
- Search box in the dataset view only filters the **view**. Removing rows is a tool
  (undoable). Nothing is ever silently destructive.
- No placeholder or disabled buttons for unfinished features.
- Components stay under ~150 lines. One responsibility each.

## Testing
- Every parser, tool, and exporter ships a `.test.ts` next to it, testing the pure function
  directly. Edge cases, not just happy paths.
- Shared fixtures live in `src/test/fixtures.ts` and MUST include: the exact Outlook
  recipient string from SPEC §4, a quoted display name containing a comma, a bare email,
  Swedish characters (åäö), CRLF input, trailing delimiter, empty entries, tab-separated
  input, and two lists with duplicate-count mismatches for compare.
- Test data uses `example.com` only. Never real people or real organisation addresses.

## UI / UX principles
- Keyboard-first: `Ctrl/Cmd+K` palette, `Enter` applies, `Ctrl/Cmd+Z` / `Shift+Ctrl/Cmd+Z`
  undo/redo, `Esc` closes. Shortcuts are shown in the UI, not just documented.
- Every tool follows the same flow: select → configure → live preview with summary →
  Apply → undo is available. No exceptions, no bespoke dialogs per tool.
- One primary action per view. Copy is always one click.
- Empty states teach: show an example paste and what will happen.
- Calm, dense, professional. All spacing/color/type values come from `styles/tokens.css`.
  No gradients, shadows, animations, or decorative cards.
- WCAG 2.2 AA: semantic HTML and native controls, visible focus, status shown as text +
  icon (never color alone), drag-and-drop always has a button alternative, dialogs trap
  focus and return it on close.

## Privacy (architecture rule, not a footer note)
List content is local browser data. It is never: sent to any API, analytics, telemetry,
or error reporter; put in a URL, query string, or hash; written to the console; loaded
from or sent to a CDN. After the static assets load, normal use makes no network requests.
Wording in the UI: "Your lists never leave your browser." (GitHub Pages, like any host,
logs visitor IPs — so do not claim "nothing is ever sent to anyone".)
The Pages site is public regardless of repo visibility: nothing private in the repo.

## Quality gates
Before reporting any task as done, run and pass: `npm run typecheck`, `npm test`,
`npm run build`. Never claim a check passed unless it was actually run. For milestones
with UI changes, run the dev server and check the result in a browser if a browser tool
is available; if not, say so explicitly in the summary.

## Definition of done for a new tool / parser / exporter
1. One file under the right folder.  2. Its `.test.ts`.  3. One line in the registry.
Nothing else. If a fourth step was needed, fix the contract, not the shell.

## Scripts
`npm run dev` · `npm run build` · `npm run preview` · `npm run typecheck` · `npm test`
Push to `main` → GitHub Actions builds and deploys to Pages.

## Anti-goals
No backend, API calls, accounts, analytics, telemetry, cloud sync, external AI calls.
No state-management library, no plugin loader, no premature Web Workers or virtualization.
No unrelated refactors inside a scoped change. No abstractions for their own sake.
