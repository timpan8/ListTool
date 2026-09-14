import { cell, draftDataset, makeRow, type Dataset, type Row } from './model';
import { normalizeKey, type NormalizeOptions } from './normalize';

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
  keyA: string;
  keyB: string;
  normalize: NormalizeOptions;
}

interface Side {
  first: string;
  rows: Row[];
}

/** Group a list's rows by normalized key, keeping order and every duplicate. */
function group(dataset: Dataset, columnId: string, normalize: NormalizeOptions): Map<string, Side> {
  const groups = new Map<string, Side>();
  for (const row of dataset.rows) {
    const value = cell(row, columnId);
    const key = normalizeKey(value, normalize);
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

export interface AlignedLabels {
  a: string;
  b: string;
  status: string;
  countA: string;
  countB: string;
  missing: string;
  statuses: Record<CompareStatus, string>;
}

/**
 * The comparison as a Dataset, so the ordinary table view renders it and the ordinary
 * exporters can copy it. Status is text, never colour alone.
 */
export function toAlignedDataset(rows: CompareRow[], labels: AlignedLabels): Dataset {
  return draftDataset({
    columns: [
      { id: 'a', name: labels.a },
      { id: 'b', name: labels.b },
      { id: 'status', name: labels.status },
      { id: 'countA', name: labels.countA },
      { id: 'countB', name: labels.countB },
    ],
    rows: rows.map((row, index) =>
      makeRow(index, {
        a: row.countA === 0 ? labels.missing : row.a,
        b: row.countB === 0 ? labels.missing : row.b,
        status: labels.statuses[row.status],
        countA: String(row.countA),
        countB: String(row.countB),
      }),
    ),
  });
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
