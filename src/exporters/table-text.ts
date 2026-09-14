import { unparse } from 'papaparse';
import { cell, type Column, type Dataset } from '../core/model';
import { stringsOption, type Options } from '../core/registry';

/**
 * The columns an exporter should write. No `columns` value at all means the whole table:
 * exporting a CSV should not require ticking every box first.
 */
export function chosenColumns(dataset: Dataset, options: Options, key = 'columns'): Column[] {
  const ids = stringsOption(options, key, []);
  // The dataset's own order wins, so the output matches what is on screen.
  const chosen = dataset.columns.filter((column) => ids.includes(column.id));
  // No usable selection — none made, or every id is stale after the columns changed —
  // means the whole table. An empty file is never what someone meant by exporting.
  return chosen.length === 0 ? dataset.columns : chosen;
}

/**
 * Shared renderer for the CSV and TSV exporters. PapaParse decides per field whether a
 * quote is needed, so a value containing the delimiter, a quote or a newline survives
 * the round trip (RFC 4180).
 */
export function renderTable(
  dataset: Dataset,
  columns: Column[],
  delimiter: string,
  header: boolean,
): string {
  const body = dataset.rows.map((row) => columns.map((column) => cell(row, column.id)));
  const data = header ? [columns.map((column) => column.name), ...body] : body;
  return unparse(data, { delimiter, newline: '\n' });
}
