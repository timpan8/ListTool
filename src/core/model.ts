/**
 * The one data shape in the app. A plain list is a Dataset with a single column
 * (`value`) — there is no separate "simple list" type.
 */
export interface Column {
  id: string;
  name: string;
}

/** Cells are keyed by Column.id. Row identity is `id`, never the array index. */
export interface Row {
  id: string;
  cells: Record<string, string>;
}

/** How a dataset was parsed, so it can be re-parsed with different options. */
export interface ParseRef {
  parserId: string;
  options: Record<string, unknown>;
}

export interface Dataset {
  id: string;
  name: string;
  columns: Column[];
  rows: Row[];
  /** The original paste or file text, kept so the user can re-parse. */
  rawInput?: string;
  parse?: ParseRef;
}

/** Column id of a one-column list. */
export const VALUE_COLUMN = 'value';

/**
 * Parsers are pure and know nothing about the workspace, so they cannot invent a
 * unique dataset id. They produce a draft; the store stamps the real id and name
 * when the dataset enters the workspace, and re-parse keeps the existing ones.
 */
export const DRAFT_DATASET_ID = 'draft';

/** Reading a cell that a row does not have yields '' — never undefined. */
export function cell(row: Row, columnId: string): string {
  return row.cells[columnId] ?? '';
}

/** Deterministic, position-based ids. Stable for the life of a row. */
export function rowId(index: number): string {
  return `r${index + 1}`;
}

/** Deterministic column ids for parsers that do not know what the data means. */
export function columnId(index: number): string {
  return `c${index + 1}`;
}

export function makeRow(index: number, cells: Record<string, string>): Row {
  return { id: rowId(index), cells };
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

/** Every cell of a row, in column order. */
export function rowValues(row: Row, columns: Column[]): string[] {
  return columns.map((column) => cell(row, column.id));
}

/** True when every cell of the row is empty or whitespace. */
export function isBlankRow(row: Row, columns: Column[]): boolean {
  return rowValues(row, columns).every((value) => value.trim() === '');
}

interface DraftInput {
  columns: Column[];
  rows: Row[];
  rawInput?: string;
  parse?: ParseRef;
}

/** Build the draft dataset a parser returns. */
export function draftDataset(input: DraftInput): Dataset {
  return {
    id: DRAFT_DATASET_ID,
    name: '',
    columns: input.columns,
    rows: input.rows,
    ...(input.rawInput !== undefined ? { rawInput: input.rawInput } : {}),
    ...(input.parse !== undefined ? { parse: input.parse } : {}),
  };
}

/**
 * A one-column dataset built from plain values. The column name is passed in rather
 * than invented here: it is user-facing text and lives in i18n with the rest.
 */
export function valuesDataset(
  values: string[],
  columnName: string,
  rawInput: string,
  parse: ParseRef,
): Dataset {
  return draftDataset({
    columns: [{ id: VALUE_COLUMN, name: columnName }],
    rows: values.map((value, index) => makeRow(index, { [VALUE_COLUMN]: value })),
    rawInput,
    parse,
  });
}
