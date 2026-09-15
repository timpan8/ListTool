# List Tool — Functional Specification

UI language: English. Code: English. See `CLAUDE.md` for the model and contracts.

## 1. Concepts
- **Dataset** — one list, always a table. A plain list is a one-column table (`value`).
  Keeps its `rawInput` so it can be re-parsed with different options.
- **Parser** — turns raw text into a Dataset. Detection is advisory; the user always confirms.
- **Tool** — pure transformation Dataset → Dataset (+ summary). Dual tools take two datasets.
- **Exporter** — renders a Dataset to text for clipboard or file.
- **History** — per dataset, serializable steps + snapshots. Undo/redo. Later: recipes.
- **Workspace** — open datasets (tabs), settings, favorites, recents, recipes.

## 2. Workspace layout (desktop first, usable on narrow screens)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ List Tool   [ Recipients ] [ Current users ] [ + ]        ⚙ Settings          │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Import] [Tools ⌘K] [Compare]   ↶ ↷                             [Copy] [Export] │
├────────────────────────────────────────────────┬─────────────────────────────┤
│ Raw | Table      Search in view…    842 rows   │ Remove duplicates           │
│ ┌────────────────────────────────────────────┐ │ Compare by:  [email ▼]      │
│ │ first    │ last      │ email             │ │ ☑ Trim   ☑ Ignore case      │
│ │ Anna     │ Andersson │ anna@example.com  │ │ ☐ Ignore diacritics         │
│ │ …                                          │ │                             │
│ └────────────────────────────────────────────┘ │ Preview: 27 duplicates       │
│                                                │ 842 → 815 rows               │
│                                                │ [Apply] [Apply to new list]  │
├────────────────────────────────────────────────┴─────────────────────────────┤
│ 842 rows · 815 unique · 4 blank · 27 duplicates                               │
└──────────────────────────────────────────────────────────────────────────────┘
```
- **Dataset tabs**: create, rename (double-click), duplicate, close, clear. Overflow menu
  when tabs don't fit — the tab bar never grows unbounded.
- **Primary toolbar is fixed**: Import, Tools, Compare, Undo, Redo, Copy, Export, Settings.
  Nothing else is ever added here. All tools live in the picker/palette.
- **Raw | Table** toggle per dataset. Raw shows the original input and a "Re-parse…" button
  that reopens the import dialog with the current parser options prefilled.
- **Search in view** filters what is shown; it never changes the dataset.
- **Tools panel** (right, collapsible; drawer on narrow screens): search box, favorites,
  recently used, then categories. The options form is generated from the tool's schema.
  Preview and summary update live as options change.
- **Apply** replaces the active dataset (undoable). **Apply to new list** opens the result
  as a new tab (useful for extracts and compare results).
- **Status bar**: rows · unique · blank · duplicates for the active dataset (unique/duplicate
  counted on the whole row, or on the selected column when one is selected).
- **Command palette** (`Ctrl/Cmd+K`): fuzzy search over tools, "Re-parse as <parser>",
  and "Copy as <exporter>". Arrow keys + Enter. This is the fast path for everything.

## 3. Import
Sources: paste into the Import dialog (or `Ctrl/Cmd+V` on an empty workspace), file
picker (`.txt`, `.csv`, `.tsv`), drag-and-drop onto the workspace (file picker is always
present — drag is never the only way). Files are read locally with the File API.

**Detection dialog** (always shown; auto-selects the best parser):
```
Detected: comma-separated values · 3 items · 1 column
Parser: [Delimited ▼]   Delimiter: (•) Auto  ( ) ,  ( ) ;  ( ) Tab  ( ) |  ( ) Newline  ( ) Custom __
☑ Trim items   ☑ Drop empty items
Preview (first 5 rows) …
[Cancel]                                                   [Import]
```
The detected choice is a suggestion; every option is editable before importing, and
again later via Raw → Re-parse.

**Delimiter detection** (`core/detect.ts`): for each candidate (`\t`, `;`, `,`, `|`,
2+ spaces) count occurrences per non-empty line; pick the candidate with the highest
count that is consistent across lines. Multi-line input with no consistent delimiter →
one item per line. Single line with a delimiter → split into rows. If ≥ 60 % of the
top-level items contain an email address → suggest the Recipients parser instead.

### Parsers (registry)
| Parser | Purpose | Options | Output columns |
|---|---|---|---|
| Lines | one item per line | trim, drop empty | `value` |
| Delimited | split one or more lines on a delimiter into rows | delimiter, trim, drop empty, split into columns instead | `value` or `c1…cN` |
| CSV/TSV | tabular data via PapaParse (RFC 4180, quotes, embedded newlines) | delimiter auto/explicit, first row is header | header names (ids `c1…cN`, names from header) |
| Recipients | `Name <email>` lists from Outlook etc. | name order, separator | `first`, `last`, `email`, `original` |
| Emails in text | pull every email address out of arbitrary text | dedupe, lowercase | `email` |

## 4. Recipients parser (detailed)
Handles, mixed in one input:
- Semicolon-separated Outlook strings (also comma-separated, and one record per line).
- `"Lastname, Firstname" <email>` — commas inside quotes are never separators (RFC 5322 §3.4).
- Bare `email@example.com` with no display name → `first`/`last` empty.
- Unicode / Swedish characters (åäö) in names and local parts.
- Trailing separators, extra whitespace, CRLF.

**Name order.** Display names commonly appear as "Lastname Firstname" (Outlook / Swedish
convention) but the email local part varies (`last.first` vs `first.last`), so the email
is **never** used to infer name order. Option `Name order: Last First (default, from
Settings) | First Last`, shown with a 3-row preview and a **Swap first/last** button. The
same swap exists as a Columns tool, so a wrong guess is one click to fix after import.
Rules: *Last First* → `last` = first token, `first` = the rest. *First Last* → `last` =
last token, `first` = the rest. A quoted `"X, Y"` is always `last = X`, `first = Y`,
regardless of the setting.

Output columns (deterministic ids): `first`, `last`, `email`, `original`.

**Test fixture — Tim's exact example, verbatim, must stay in `src/test/fixtures.ts`:**
```
last1 first1 <last1.first1@exempel.com>; last2 first2 <first2.last2@exempel.com>; last3 first3 <first3.last3@exempel.com>
```
Expected with *Last First*: `(first1, last1, last1.first1@exempel.com)`,
`(first2, last2, first2.last2@exempel.com)`, `(first3, last3, first3.last3@exempel.com)`.
Add fixtures for: `"Andersson, Anna" <anna.andersson@example.com>; bob@example.com`,
`Öberg Åsa <asa.oberg@example.com>`, and a CRLF + trailing-`;` variant.

## 5. Tool interaction model
Identical for every tool: pick it → options form (generated) → live preview + summary →
Apply / Apply to new list → undo available. Tools report what they did:
"14 blank rows removed", "27 duplicates removed (815 → 788 rows)", "83 cells changed".
Dual tools show a second-dataset picker (any open tab). `appliesTo` hides tools that
don't fit the active dataset (e.g. column tools on a one-column list).

## 6. Compare mode (detailed)
The only special layout in the shell. Two panels side by side; each is an open dataset or
a fresh paste box (paste → detection dialog → becomes a dataset tab). Results update live.

Options: key column for A and for B (defaults: `email` if present, else the only/first
column); normalization: ☑ trim, ☑ ignore case, ☐ collapse whitespace, ☐ ignore diacritics.
Matching is deterministic normalized-exact. Never fuzzy by default.

Result is an aligned table rendered by the generic table view:
```
A                      B                      Status          #A  #B
anna@example.com       anna@example.com       ✓ Match          1   1
bob@example.com        bob@example.com        ≠ Count differs  1   2
charlie@example.com    —                      ← Only in A      1   0
—                      david@example.com      → Only in B      0   1
```
- Status is text + icon. Duplicate counts are kept (multiset compare); a plain
  `Set<string>` would lose them.
- Filter chips: All · Matches · Differences · Only in A · Only in B · Count differs.
- **Create list from…**: Both · Only in A · Only in B · A + B without duplicates ·
  All differences → new dataset tab with the full original rows (not just the key).
- The same operations exist as dual tools (Compare category) so they work in recipes:
  intersection, union, A − B, B − A, symmetric difference — friendly labels in the UI.
- Narrow screens: panels stack; the result table stays one table.

## 7. Export and copy
Every result has **Copy**. Copy takes what is on screen: the ticked rows if any, else the
rows the search and the filter show, every column, in the order shown — as a table (TSV
plus the HTML flavour, so Excel gets cells) when the list has more than one column, as
lines when it has one. The Export dialog lists exporters with their options and offers
the shown, ticked or all rows; export renders from the dataset narrowed to that scope,
never from the visible DOM.

| Exporter | Output | Options | Phase |
|---|---|---|---|
| Lines | one value per line | column | MVP |
| Joined line | `a, b, c` | delimiter, column | MVP |
| Quoted list | `'a','b','c'` — for SQL `IN` / PowerShell | quote char, separator, column | MVP |
| CSV / TSV | file download | header, columns | MVP |
| JSON array | `["a","b"]` or array of objects | rows as objects | Phase 2 |
| PowerShell array | `@('a','b')` | column | Phase 2 |
| SQL IN | `('a','b')` | column | Phase 2 |
| Markdown / HTML table | table markup | header | Phase 2 |
| XLSX | file via SheetJS, lazy-loaded | — | Later |

## 8. History, undo/redo, recipes
Per dataset: `Ctrl/Cmd+Z` undo, `Shift+Ctrl/Cmd+Z` redo. History panel lists steps with
their summaries. Steps are serializable (tool id + options).
**Recipes (Phase 2):** save a history (or a selection of steps) as a named recipe, e.g.
"Outlook cleanup: Recipients → Trim → Lowercase email → Dedupe by email → Sort by last".
Apply a recipe to any dataset; edit/remove steps; recipes persist locally.

## 9. Persistence and "Clear all data"
Stored in localStorage under one key: open datasets (incl. `rawInput`), settings, favorites,
recents, recipes. Setting **Keep lists between sessions** (default on; when off only
settings/favorites/recipes persist). Writes are debounced. On `QuotaExceededError`: warn once,
keep working in memory. **Clear all data** button in Settings wipes the key immediately.
Nothing is ever put in the URL.

## 10. Settings
Default delimiter · Sort locale (Swedish `sv` default — å ä ö sort after z; or English) ·
Natural/numeric sort on by default · Default name order (Last First) · Keep lists between
sessions · Clear all data.

## 11. Keyboard shortcuts
| Keys | Action |
|---|---|
| Ctrl/Cmd+K | Command palette |
| Enter | Apply current tool |
| Ctrl/Cmd+Z / Shift+Ctrl/Cmd+Z | Undo / redo |
| Ctrl/Cmd+C (nothing selected) | Copy what is shown — the ticked rows if any — with every column |
| Esc | Close panel / dialog |
| Ctrl/Cmd+V (empty workspace) | Open import with clipboard content |

## 12. Tool catalogue
Phases: **MVP** · **P2** (Phase 2) · **Later**. Every tool is one module + test + registry line.

### Clean
| Tool | Purpose | Key options | Phase |
|---|---|---|---|
| Trim whitespace | remove leading/trailing whitespace | column/all | MVP |
| Collapse whitespace | `Anna    Andersson` → `Anna Andersson` | column/all | MVP |
| Remove blank rows | drop rows where selected/all cells are empty | column/all | MVP |
| Remove duplicates | keep first occurrence by normalized key | key column, trim, ignore case, ignore diacritics | MVP |
| Change case | UPPER / lower / Title / Sentence | column, mode | MVP |
| Find duplicates | report duplicates with counts, don't remove | same as dedupe | P2 |
| Validate emails | flag rows whose email is malformed (new `valid` column) | column | P2 |

### Transform
| Tool | Purpose | Key options | Phase |
|---|---|---|---|
| Sort | A–Z / Z–A, natural numeric, by column, by length | column, direction, locale, numeric | MVP |
| Filter rows | keep/remove rows: contains / equals / starts / ends / regex | column, mode, pattern, invert | MVP |
| Find & replace | plain or regex, per column | column, find, replace, regex, ignore case | MVP |
| Add prefix / suffix | wrap each value | column, prefix, suffix | MVP |
| Number rows | prepend or add column with numbers | start, as column | P2 |
| Reverse / shuffle | reorder rows | mode | P2 |
| Remove rows found in list B | A − B as a single-click tool | key columns, normalization | P2 |

### Columns
| Tool | Purpose | Key options | Phase |
|---|---|---|---|
| Split column | split on delimiter into N columns | column, delimiter | MVP |
| Merge columns | join columns into one | columns, separator | P2 |
| Swap first/last | swap two columns' contents (fixes name order) | column A, column B | MVP |
| Rename / reorder / remove columns | manage columns | selection | P2 |
| Build display name | `first` + `last` → `display` | order, separator | P2 |
| Generate email | `first`, `last` → `email` with pattern | pattern (`first.last`), domain, lowercase, strip diacritics | P2 |
| Transpose | rows ⇄ columns | — | Later |

### Extract
| Tool | Purpose | Key options | Phase |
|---|---|---|---|
| Extract pattern | one tool with presets: email, domain, URL, IPv4/IPv6, GUID, number, custom regex → new column or new list | column, preset/regex, all matches | MVP (email, domain, regex) · P2 (rest) |
| Count values | frequency table of a column, sorted by count | column, normalization | P2 |

### Compare (dual)
| Tool | Purpose | Key options | Phase |
|---|---|---|---|
| Compare lists | aligned A/B table with status and counts (see §6) | keys, normalization | MVP |
| Set operations | intersection, union, A − B, B − A, symmetric difference | keys, normalization | P2 |
| Join lists | inner / left join on a key, merging columns | keys | Later |
| Multi-column keys | match on more than one column | — | Later |
| Fuzzy match review | suggested matches with a similarity score, manual accept/reject, never default | threshold | Later |

## 13. Later (design for, don't build now)
Web Workers for large lists · table virtualization · PWA offline caching · JSON import ·
XLSX export (lazy-loaded SheetJS) · Swedish UI (strings are already centralized in `i18n/en.ts`).
