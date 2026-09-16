import { rowIdsAfter, type Dataset, type Row } from './model';
import type { Options, Tool, ToolResult } from './registry';

export interface ScopedResult extends ToolResult {
  /**
   * True when the result is the whole list with the tool's work merged into the ticked
   * rows. False when the tool reshaped the rows it was given — a count, a transpose —
   * so the result is only ever those rows' own, fit for a new list and never a
   * replacement for this one.
   */
  merged: boolean;
}

/** The ids the ticked rows carry while the tool runs: ones no tool ever mints itself. */
const SCOPED = 's:';

/**
 * Run a tool on the ticked rows only. The tool sees a list of just those rows; what it
 * hands back is merged into the whole list by row id: a ticked row's slot takes the next
 * surviving output row (so a sort reorders within the ticked slots, a filter removes only
 * ticked rows), a slot whose row is gone collapses, rows the tool created land after the
 * last ticked slot with fresh ids, and every unticked row is copied untouched — with an
 * empty cell in any column the tool added.
 *
 * Nothing here knows any tool by name. The ticked rows go in under ids no tool mints,
 * so a tool that keeps its rows hands them back under those ids and a tool that builds a
 * fresh table does not; that, and whether every input column is still there, decides
 * whether the result can be merged at all.
 */
export function runOnRows(
  tool: Tool,
  input: Dataset,
  rowIds: string[],
  options: Options,
  second?: Dataset,
): ScopedResult {
  const chosen = new Set(rowIds);
  const subset: Dataset = {
    ...input,
    rows: input.rows
      .filter((row) => chosen.has(row.id))
      .map((row) => ({ id: `${SCOPED}${row.id}`, cells: row.cells })),
  };
  const result = tool.run(subset, options, second);

  if (result.output === subset) return { ...result, output: input, merged: true };

  const inputIds = input.columns.map((column) => column.id);
  const outputIds = new Set(result.output.columns.map((column) => column.id));
  const keepsColumns = inputIds.every((id) => outputIds.has(id));
  const survivors = result.output.rows.filter((row) => row.id.startsWith(SCOPED));
  const keepsRows = result.output.rows.length === 0 || survivors.length > 0;
  if (!keepsColumns || !keepsRows || (result.extraLists ?? []).length > 0) {
    return { ...result, merged: false };
  }

  const nextId = rowIdsAfter(input);
  const created = result.output.rows
    .filter((row) => !row.id.startsWith(SCOPED))
    .map((row) => ({ id: nextId(), cells: row.cells }));
  const added = result.output.columns.filter((column) => !inputIds.includes(column.id));
  const blanks = Object.fromEntries(added.map((column) => [column.id, '']));

  const rows: Row[] = [];
  let next = 0;
  let after = 0;
  for (const row of input.rows) {
    if (!chosen.has(row.id)) {
      rows.push(added.length === 0 ? row : { id: row.id, cells: { ...blanks, ...row.cells } });
      continue;
    }
    const survivor = survivors[next];
    if (survivor !== undefined) {
      rows.push({ id: survivor.id.slice(SCOPED.length), cells: survivor.cells });
      next += 1;
    }
    after = rows.length;
  }
  const merged =
    created.length === 0 ? rows : [...rows.slice(0, after), ...created, ...rows.slice(after)];

  return {
    ...result,
    output: { ...input, columns: result.output.columns, rows: merged },
    merged: true,
  };
}
