# List Tool — Implementation Plan

Work one milestone at a time. After each: run `npm run typecheck`, `npm test`,
`npm run build`; give a short summary (what was built, what was verified, what's next);
then STOP and wait for review.

## M1 — Scaffold + deploy
Scope: Preact + TS + Vite project, Vite `base` for the Pages project path, the
`.github/workflows/deploy.yml` workflow, `tokens.css` skeleton, placeholder page,
README with run/test/build/deploy commands.
Done when:
- `npm run dev` runs; typecheck/test/build are green (with one trivial test).
- Push to `main` → green Actions run → live Pages URL shows the placeholder with assets loading.

## M2 — Core + shell + import + export
Scope: `core/` (model, registry types, history, store, stats, detect), the three registries
(empty but wired), shell layout with dataset tabs, Raw | Table view, search-in-view, status
bar, Import dialog with detection + preview + re-parse, parsers Lines / Delimited / CSV-TSV,
exporters Lines / Joined line / Quoted list / CSV / TSV, Copy button, undo/redo wired
(no tools yet, so re-parse is the first undoable step).
Done when:
- Paste `data1, data2, data3` → detection says comma, 3 items → import → 3 rows.
- Paste 3 lines → one row each. Import a CSV with a header → columns named from header.
- Raw → Re-parse with a different delimiter changes the table; undo restores it.
- Copy and every MVP exporter produce correct text; export reflects the dataset, not the view.
- Adding a parser or exporter required zero shell edits (demonstrate with the last one added).

## M3 — First tools + recipients parser
Scope: Recipients parser (+ Emails-in-text parser), tools: Trim, Collapse whitespace,
Remove blank rows, Remove duplicates, Change case, Sort, Filter rows, Find & replace,
Prefix/suffix, Split column, Swap first/last, Extract pattern (email/domain/regex).
Generated options panel (all `OptionField` types incl. `column` and `delimiter`), live
preview + summary, Apply / Apply to new list, history panel.
Done when:
- The exact Outlook fixture parses to first/last/email/original with Last First; Swap fixes order.
- Quoted `"Andersson, Anna"`, bare email, åäö, CRLF and trailing-`;` fixtures pass.
- Every tool has a test; dedupe keeps first occurrence; sort with `sv` puts å ä ö after z.
- Each tool followed select → configure → preview → apply → undo with NO shell changes.

## M4 — Compare mode
Scope: `core/compare.ts` (multiset, normalized keys), Compare mode layout with two panels
(open dataset or paste box), key/normalization options, aligned result table with status +
counts, filter chips, "Create list from…", set-operation dual tools.
Done when:
- Two pasted lists align live; case + trim normalization matches `Anna@X.se ` to `anna@x.se`.
- Duplicate counts are reported (`anna: A=2, B=1` → Count differs).
- Matching on `email` shows full rows; each "Create list from…" opens a correct new tab.
- Panels stack on a narrow viewport.

## M5 — Palette, favorites, persistence, polish
Scope: command palette (tools + re-parse + copy-as), favorites and recents, keyboard
shortcuts shown in UI, localStorage persistence with "Keep lists between sessions" and
Clear all data, Settings, accessibility pass (focus, labels, text+icon status, dialog
focus return), empty states.
Done when:
- Workspace survives reload; Clear all data wipes it; quota error degrades gracefully.
- Full MVP flow is doable with keyboard only. No network requests after assets load.
- Every user-facing string lives in `i18n/en.ts`.

## M6 — Recipes + Phase 2 tools
Scope: save history as a recipe, apply/edit/remove, persistence; Phase 2 tools and
exporters from SPEC §7 and §12; README section "How to add a tool / parser / exporter".
Done when:
- "Recipients → Trim → Lowercase email → Dedupe by email → Sort by last" saved and replayed
  end-to-end on fresh input.
- Later items (§13) remain unbuilt — no placeholders in the UI.

## M7 — Working in the table, and the twenty gaps
Scope: the twenty improvements asked for after M6. Contract additions first (`rows` option
field, `from: 'second'` on column fields, `extraLists` on `ToolResult`, optional `html()`
on `Exporter`), then the modules that need them.

Tools: Fix mojibake, Clean invisible characters, Normalise phone numbers, Find
near-duplicates, Split into rows, Split into batches, Add another list to the end, Set
value, Selected rows, Transpose, Group and summarise, Join lists, Mark what is in another
list. Parser: HTML table. Exporter: Template. Core: similarity, profile, diff, view.
Shell: editable cells, row ticks, import into an open list, extra lists as tabs, the
Columns tab and its facet filter, changed-cell marks in the preview, both clipboard
flavours, save and open a workspace file.

Done when:
- Every one of the twenty is reachable from the ordinary UI, with no shell special case
  for any individual tool, parser or exporter.
- A cell edit, a row selection acted on, and an import into an open list are each one
  undoable step.
- A table copied out of Excel pastes back as a table; a list copied from here pastes into
  Excel as cells.
- Compare matches on several columns at once, and three lists can be compared by running
  Mark what is in another list once per list.
- A saved workspace file restores the lists, recipes, favourites and settings, and a file
  that is not one is refused without emptying the screen.

## M8 — The fifteen that were still missing
Scope: the improvements numbered 6-20 in the second review round.

Tools: multi-key Sort, Filter on several rules, Remove duplicates with a choice of which
row survives, Build a column from a template, Header row, Cross-tab, Turn columns into
rows, Take a sample, Split into lists by a value, What changed between two lists, Fill the
gaps from another list, Read a column with a parser. Parser: JSON. Exporter: Recipients.
Core: template.ts, checkup.ts. Shell: the checkup findings above the tool list.

Contract: `allowNone` on a `column` field, and an optional `check(input)` on Tool.

Done when:
- A tool that answers `check` turns up under "Worth a look" with the tool configured
  behind it, and no tool is named anywhere in the shell to make that happen.
- Sorting by surname then first name is one step, and each key has its own direction.
- The Outlook round trip is exact: parse a recipient list, clean it, write it back.
- Reading a column with the Recipients parser turns one stuck cell into first, last and
  email columns.

## M9 — Quality overhaul
Scope: the review after M8 — the tool has the parts but not the level. Five phases, one
pull request each, gated by CI on every pull request and by the browser suite this
milestone schedules: `@playwright/test` as a dev dependency, `e2e/*.e2e.ts` run by
`npm run e2e` against the dev server, Chromium only.

1. **Copy what I see** — Copy, Ctrl+C and the palette copy the ticked rows if any, else
   the rows on screen, every column, as a table (TSV + HTML); the export dialog offers
   shown / ticked / all rows and remembers the last format; column selects show the
   columns that actually run.
2. **The table as a workbench** — click a header to sort the view, a header menu for
   filter / rename / move / remove / tools for this column, actions for ticked rows,
   changed rows first in the preview, keyboard movement between cells, numbers right
   aligned, memoised checkup and profile, a 500-row cap with Show more; tools keep row
   ids so the preview marks what really changed.
3. **Compare as a diff view** — two lists called by their names everywhere, one row per
   key with both sides' columns beside each other, differing cells marked, create a list
   or copy from any bucket; every dual tool's form names the lists; recipes replay dual
   tools when the second list is open.
4. **Data tools, consistency, performance** — normalise dates and numbers, validate
   Swedish ID numbers, pad / truncate, fill down, column maths, capture groups, sort as
   numbers or dates; run any tool on the ticked rows only; the audit's consistency
   fixes; near-duplicates and cross-tab that stay fast on large lists.
5. **Swedish** — every string in Swedish as well as English, chosen in Settings; English
   stays the default.

Done when:
- Every phase's pull request passed typecheck, tests, build and the browser suite.
- Copy from a three-column list pastes into Excel as three columns of the rows on screen.
- Compare shows both list names and marks the cells that differ on matched rows.
- A 10 000-row list sorts, filters and previews a tool without a visible freeze.
- The whole UI reads in Swedish with no key missing, proven by a parity test.
