import { cell, type Dataset, type Row } from './model';
import { normalizeKey, type NormalizeOptions } from './normalize';

/**
 * One value of one column, picked in the column profile. Like the search box it narrows
 * the VIEW and never the list — removing rows stays a tool, and stays undoable.
 */
export interface ViewFilter {
  columnId: string;
  /** '' means the empty cells. */
  value: string;
}

/** The same grouping the column profile uses, so a value shows exactly its own rows. */
const MATCH: NormalizeOptions = { trim: true, ignoreCase: true };

/** Rows matching the search box. The view narrows; the list never does. */
export function searched(dataset: Dataset, query: string): Row[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return dataset.rows;
  return dataset.rows.filter((row) =>
    dataset.columns.some((column) => cell(row, column.id).toLowerCase().includes(needle)),
  );
}

/** Rows matching a value picked in the column profile. '' means the empty cells. */
export function faceted(rows: Row[], filter: ViewFilter | null): Row[] {
  if (filter === null) return rows;
  const wanted = normalizeKey(filter.value, MATCH);
  return rows.filter((row) => normalizeKey(cell(row, filter.columnId), MATCH) === wanted);
}

/** Everything the view narrows by, in one place. */
export function visibleRows(
  dataset: Dataset,
  query: string,
  filter: ViewFilter | null,
): Row[] {
  return faceted(searched(dataset, query), filter);
}
