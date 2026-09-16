import { cellKey } from './diff';
import { cell, draftDataset, rowId, type Column, type Dataset, type Row } from './model';
import { joinKeys, normalizeKey, type NormalizeOptions } from './normalize';

export type CompareStatus = 'match' | 'count-differs' | 'only-a' | 'only-b';

export interface CompareRow {
  /** The normalized key both sides matched on. */
  key: string;
  /** The value as it is written in each list — normalization never reaches the display. */
  a: string;
  b: string;
  countA: number;
  countB: number;
  status: CompareStatus;
  /** The original rows behind each side, so a new list can carry whole rows. */
  rowsA: Row[];
  rowsB: Row[];
}

export interface CompareResult {
  rows: CompareRow[];
  stats: {
    match: number;
    'count-differs': number;
    'only-a': number;
    'only-b': number;
  };
}

export interface CompareOptions {
  /** One or more columns. Several make a compound key, for lists with no single id. */
  keyA: string[];
  keyB: string[];
  normalize: NormalizeOptions;
}

/** Joins the parts of a compound key for display. Punctuation, not translatable text. */
const DISPLAY_SEPARATOR = ' · ';

interface Side {
  first: string;
  rows: Row[];
}

/** Group a list's rows by normalized key, keeping order and every duplicate. */
function group(
  dataset: Dataset,
  columnIds: string[],
  normalize: NormalizeOptions,
): Map<string, Side> {
  const ids = columnIds.length === 0 ? [dataset.columns[0]?.id ?? ''] : columnIds;
  const groups = new Map<string, Side>();

  for (const row of dataset.rows) {
    const value = ids.map((columnId) => cell(row, columnId)).join(DISPLAY_SEPARATOR);
    const key = joinKeys(ids.map((columnId) => normalizeKey(cell(row, columnId), normalize)));
    const existing = groups.get(key);
    if (existing === undefined) {
      groups.set(key, { first: value, rows: [row] });
    } else {
      existing.rows.push(row);
    }
  }
  return groups;
}

/**
 * A multiset comparison: duplicate counts are kept, so `anna: A=2, B=1` reports
 * "count differs" instead of a clean match. A plain Set would lose exactly that.
 * Matching is deterministic normalized-exact — never fuzzy.
 */
export function compareDatasets(
  a: Dataset,
  b: Dataset,
  options: CompareOptions,
): CompareResult {
  const groupsA = group(a, options.keyA, options.normalize);
  const groupsB = group(b, options.keyB, options.normalize);

  const rows: CompareRow[] = [];
  const stats = { match: 0, 'count-differs': 0, 'only-a': 0, 'only-b': 0 };

  function push(key: string, sideA: Side | undefined, sideB: Side | undefined): void {
    const countA = sideA?.rows.length ?? 0;
    const countB = sideB?.rows.length ?? 0;
    const status: CompareStatus =
      countA === 0 ? 'only-b' : countB === 0 ? 'only-a' : countA === countB ? 'match' : 'count-differs';

    stats[status] += 1;
    rows.push({
      key,
      a: sideA?.first ?? '',
      b: sideB?.first ?? '',
      countA,
      countB,
      status,
      rowsA: sideA?.rows ?? [],
      rowsB: sideB?.rows ?? [],
    });
  }

  // A's order first, then whatever only B has — stable and easy to read against A.
  for (const [key, sideA] of groupsA) push(key, sideA, groupsB.get(key));
  for (const [key, sideB] of groupsB) {
    if (!groupsA.has(key)) push(key, undefined, sideB);
  }

  return { rows, stats };
}

/** The words the side-by-side table needs. Formatted by the caller: core knows no i18n. */
export interface CompareLabels {
  status: string;
  countA: string;
  countB: string;
  /** What a cell shows when that side has no row: an em dash. */
  missing: string;
  /** The status of one row, with the list names and the counts in it. */
  statusText: (row: CompareRow) => string;
}

export interface ColumnGroup {
  name: string;
  columnIds: string[];
}

export interface SideBySide {
  /** One row per key: the status, then every column of each list, side by side. */
  dataset: Dataset;
  /** Which columns belong to which list, so a table can head them with the names. */
  groups: ColumnGroup[];
  /** `cellKey(rowId, columnId)` of both cells of a paired column whose values differ. */
  changedCells: Set<string>;
  statusOf: Map<string, CompareStatus>;
}

export const STATUS_COLUMN = 'status';
const SIDE_A = 'a_';
const SIDE_B = 'b_';
/** No column id ever holds a #, so the count columns cannot collide with a list's own. */
const COUNT_A = 'a_#';
const COUNT_B = 'b_#';

const NAME_MATCH: NormalizeOptions = { trim: true, ignoreCase: true };

/**
 * Which column of one list is which column of the other: by name first, then by id for
 * whatever is left. Two lists pasted from the same kind of export have the same names;
 * two plain lists both have "Value". Kept in the first list's order.
 */
export function pairColumns(a: Dataset, b: Dataset): [Column, Column][] {
  const pairs = new Map<string, Column>();
  const taken = new Set<string>();

  const byName = new Map<string, Column>();
  for (const column of b.columns) {
    const name = normalizeKey(column.name, NAME_MATCH);
    if (!byName.has(name)) byName.set(name, column);
  }
  for (const column of a.columns) {
    const match = byName.get(normalizeKey(column.name, NAME_MATCH));
    if (match !== undefined && !taken.has(match.id)) {
      pairs.set(column.id, match);
      taken.add(match.id);
    }
  }
  for (const column of a.columns) {
    if (pairs.has(column.id)) continue;
    const match = b.columns.find((candidate) => candidate.id === column.id && !taken.has(candidate.id));
    if (match !== undefined) {
      pairs.set(column.id, match);
      taken.add(match.id);
    }
  }

  return a.columns
    .filter((column) => pairs.has(column.id))
    .map((column) => [column, pairs.get(column.id) as Column]);
}

/**
 * The comparison as one table: the status, then A's columns, then B's, one row per key,
 * with the first row of each side behind it. Where both sides have the row, every paired
 * column whose values differ is marked on both sides — the "what differs" a list of
 * matches never shows. Count columns appear only when some key repeats. Status is text
 * and an icon, never colour alone.
 */
export function sideBySide(
  result: CompareResult,
  a: Dataset,
  b: Dataset,
  labels: CompareLabels,
  normalize: NormalizeOptions,
): SideBySide {
  const countsMatter = result.rows.some((row) => row.countA > 1 || row.countB > 1);
  const idsA = a.columns.map((column) => `${SIDE_A}${column.id}`);
  const idsB = b.columns.map((column) => `${SIDE_B}${column.id}`);
  const columns: Column[] = [
    { id: STATUS_COLUMN, name: labels.status },
    ...a.columns.map((column, index) => ({ id: idsA[index] as string, name: column.name })),
    ...(countsMatter ? [{ id: COUNT_A, name: labels.countA }] : []),
    ...b.columns.map((column, index) => ({ id: idsB[index] as string, name: column.name })),
    ...(countsMatter ? [{ id: COUNT_B, name: labels.countB }] : []),
  ];
  const pairs = pairColumns(a, b);
  const changedCells = new Set<string>();
  const statusOf = new Map<string, CompareStatus>();

  const rows: Row[] = result.rows.map((row, index) => {
    const id = rowId(index);
    const first = row.rowsA[0];
    const second = row.rowsB[0];
    const cells: Record<string, string> = { [STATUS_COLUMN]: labels.statusText(row) };
    a.columns.forEach((column, at) => {
      cells[idsA[at] as string] = first === undefined ? labels.missing : cell(first, column.id);
    });
    b.columns.forEach((column, at) => {
      cells[idsB[at] as string] = second === undefined ? labels.missing : cell(second, column.id);
    });
    if (countsMatter) {
      cells[COUNT_A] = String(row.countA);
      cells[COUNT_B] = String(row.countB);
    }
    if (first !== undefined && second !== undefined) {
      for (const [columnA, columnB] of pairs) {
        const left = normalizeKey(cell(first, columnA.id), normalize);
        const right = normalizeKey(cell(second, columnB.id), normalize);
        if (left !== right) {
          changedCells.add(cellKey(id, `${SIDE_A}${columnA.id}`));
          changedCells.add(cellKey(id, `${SIDE_B}${columnB.id}`));
        }
      }
    }
    statusOf.set(id, row.status);
    return { id, cells };
  });

  return {
    dataset: draftDataset({ columns, rows }),
    groups: [
      { name: a.name, columnIds: [...idsA, ...(countsMatter ? [COUNT_A] : [])] },
      { name: b.name, columnIds: [...idsB, ...(countsMatter ? [COUNT_B] : [])] },
    ],
    changedCells,
    statusOf,
  };
}

export type SelectionKind = 'both' | 'only-a' | 'only-b' | 'union' | 'differences';

/** Which side's original rows a "Create list from…" choice should carry. */
export function selectRows(rows: CompareRow[], kind: SelectionKind): { a: Row[]; b: Row[] } {
  const a: Row[] = [];
  const b: Row[] = [];

  for (const row of rows) {
    const inBoth = row.countA > 0 && row.countB > 0;
    if (kind === 'both' && inBoth) a.push(...row.rowsA);
    if (kind === 'only-a' && row.status === 'only-a') a.push(...row.rowsA);
    if (kind === 'only-b' && row.status === 'only-b') b.push(...row.rowsB);
    if (kind === 'union') {
      // One row per key: A's copy when it has one, otherwise B's.
      if (row.countA > 0) a.push(row.rowsA[0] as Row);
      else b.push(row.rowsB[0] as Row);
    }
    if (kind === 'differences' && !inBoth) {
      if (row.countA > 0) a.push(...row.rowsA);
      else b.push(...row.rowsB);
    }
  }

  return { a, b };
}
