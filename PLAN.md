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
