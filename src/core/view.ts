import { cell, type Dataset, type Row } from './model';
import { normalizeKey, type NormalizeOptions } from './normalize';
import { sortBy, type SortOptions } from './sort';

/**
 * One value of one column, picked in the column profile or typed in a header filter.
 * Like the search box it narrows the VIEW and never the list — removing rows stays a
 * tool, and stays undoable.
 */
export interface ViewFilter {
  columnId: string;
  /** '' means the empty cells. */
  value: string;
  /** Whole-cell match (a facet, the default) or anywhere in the cell (a typed filter). */
  mode?: 'equals' | 'contains';
}

/** An order the VIEW shows rows in. The list keeps its own order until a Sort step. */
export interface ViewSort {
  columnId: string;
  direction: 'asc' | 'desc';
}

/** Everything that decides which rows are on screen, in what order, and which are ticked. */
export interface ViewState {
  query: string;
  filter: ViewFilter | null;
  sort: ViewSort | null;
  /** Ids of the rows ticked in the table, in list order. */
  ticked: string[];
}

export const EMPTY_VIEW: ViewState = { query: '', filter: null, sort: null, ticked: [] };

/** Which rows an action takes: the ones on screen, the ticked ones, or the whole list. */
export type RowScope = 'shown' | 'ticked' | 'all';

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

/** Rows matching a value picked in the column profile or typed for a column. */
export function faceted(rows: Row[], filter: ViewFilter | null): Row[] {
  if (filter === null) return rows;
  const wanted = normalizeKey(filter.value, MATCH);
  if (filter.mode === 'contains' && wanted !== '') {
    return rows.filter((row) => normalizeKey(cell(row, filter.columnId), MATCH).includes(wanted));
  }
  return rows.filter((row) => normalizeKey(cell(row, filter.columnId), MATCH) === wanted);
}

/** Rows in the view's order: a stable sort on one column, or the list's own order. */
export function sorted(rows: Row[], sort: ViewSort | null, options: SortOptions = {}): Row[] {
  if (sort === null) return rows;
  return sortBy(rows, (row) => cell(row, sort.columnId), {
    ...options,
    descending: sort.direction === 'desc',
  });
}

/** Everything the view narrows and orders by, in one place. */
export function visibleRows(
  dataset: Dataset,
  query: string,
  filter: ViewFilter | null,
  sort: ViewSort | null = null,
  sortOptions: SortOptions = {},
): Row[] {
  return sorted(faceted(searched(dataset, query), filter), sort, sortOptions);
}

/**
 * The rows a scope names. "Shown" is what the table shows, in the order it shows it.
 * "Ticked" is every ticked row, whether or not the search still shows it — a tick is a
 * deliberate choice, and hiding a row does not unmake it — in the view's order.
 * "All" is the list itself, in its own order.
 */
export function scopeRows(
  dataset: Dataset,
  scope: RowScope,
  view: ViewState,
  sortOptions: SortOptions = {},
): Row[] {
  if (scope === 'all') return dataset.rows;
  if (scope === 'ticked') {
    const chosen = new Set(view.ticked);
    return sorted(
      dataset.rows.filter((row) => chosen.has(row.id)),
      view.sort,
      sortOptions,
    );
  }
  return visibleRows(dataset, view.query, view.filter, view.sort, sortOptions);
}

/** What one-click Copy takes: the ticked rows when there are any, else what is shown. */
export function copyScope(view: ViewState): RowScope {
  return view.ticked.length > 0 ? 'ticked' : 'shown';
}

/** The dataset as the view shows it, so an exporter can render exactly that. */
export function withVisible(dataset: Dataset, rows: Row[]): Dataset {
  return { ...dataset, rows };
}
