import { cell, type Column, type Dataset, type Row } from '../core/model';
import { stringOption, type Options } from '../core/registry';
import { en } from '../i18n/en';
import { plural } from '../i18n/format';

/**
 * The columns a tool should work on: the chosen one, or every column when the option is
 * empty (the "All columns" choice a `column` field with `allowAll` offers).
 */
export function targetColumns(dataset: Dataset, options: Options, key = 'column'): Column[] {
  const id = stringOption(options, key, '');
  if (id === '') return dataset.columns;
  const chosen = dataset.columns.find((column) => column.id === id);
  return chosen === undefined ? dataset.columns : [chosen];
}

/** The one column a tool needs. Falls back to the first, so it always has something. */
export function targetColumn(
  dataset: Dataset,
  options: Options,
  key = 'column',
): Column | undefined {
  const id = stringOption(options, key, '');
  return dataset.columns.find((column) => column.id === id) ?? dataset.columns[0];
}

export interface CellChange {
  rows: Row[];
  /** How many cells the transform actually changed. */
  changed: number;
}

/**
 * Apply a per-cell transform to the given columns, counting real changes only. A row
 * with no changed cell is handed back as the same object, so snapshots share what did
 * not change and a diff has nothing to look at there.
 */
export function mapCells(
  dataset: Dataset,
  columns: Column[],
  transform: (value: string, column: Column, row: Row) => string,
): CellChange {
  const ids = new Set(columns.map((column) => column.id));
  let changed = 0;

  const rows = dataset.rows.map((row) => {
    const cells: Record<string, string> = { ...row.cells };
    let touched = false;
    for (const column of dataset.columns) {
      if (!ids.has(column.id)) continue;
      const before = cell(row, column.id);
      const after = transform(before, column, row);
      if (after === before) continue;
      changed += 1;
      touched = true;
      cells[column.id] = after;
    }
    return touched ? { id: row.id, cells } : row;
  });

  return { rows, changed };
}

/**
 * Fresh row ids for rows a tool creates: each call gives the next id past the highest
 * one the list already uses. Ids are never re-derived from positions — after a removal
 * the positions have gaps, and `r3` may well still be someone.
 */
export function rowIdsAfter(dataset: { rows: Row[] }): () => string {
  let highest = 0;
  for (const row of dataset.rows) {
    const match = /^r(\d+)$/.exec(row.id);
    if (match !== null) highest = Math.max(highest, Number(match[1]));
  }
  return () => {
    highest += 1;
    return `r${highest}`;
  };
}

/** Same dataset, different rows. rawInput and the parse options survive. */
export function withRows(dataset: Dataset, rows: Row[]): Dataset {
  return { ...dataset, rows };
}

/** Same dataset, different shape. */
export function withColumns(dataset: Dataset, columns: Column[], rows: Row[]): Dataset {
  return { ...dataset, columns, rows };
}

export function cellsPhrase(count: number): string {
  return plural(count, en.tools.cells);
}

export function rowsPhrase(count: number): string {
  return plural(count, en.tools.rows);
}

/** A column id that no existing column uses, derived from a wanted base. */
export function freeColumnId(dataset: { columns: Column[] }, base: string): string {
  const taken = new Set(dataset.columns.map((column) => column.id));
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`;
}

/**
 * Does this value match this rule? Shared by Filter rows and Filter on several rules, so
 * "contains" means the same thing in both and a fix reaches both.
 */
export function matchesText(
  value: string,
  mode: string,
  pattern: string,
  ignoreCase: boolean,
): boolean {
  if (mode === 'regex') {
    const regex = safeRegExp(pattern, ignoreCase ? 'iu' : 'u');
    return regex !== null && regex.test(value);
  }
  const haystack = ignoreCase ? value.toLocaleLowerCase() : value;
  const needle = ignoreCase ? pattern.toLocaleLowerCase() : pattern;

  if (mode === 'equals') return haystack === needle;
  if (mode === 'starts') return haystack.startsWith(needle);
  if (mode === 'ends') return haystack.endsWith(needle);
  return haystack.includes(needle);
}

/** Compile a user-supplied pattern, or null when it does not compile. */
export function safeRegExp(pattern: string, flags: string): RegExp | null {
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}
