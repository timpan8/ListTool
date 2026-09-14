import { unparse } from 'papaparse';
import { rowValues, type Dataset } from '../core/model';

/**
 * Shared renderer for the CSV and TSV exporters. PapaParse decides per field whether a
 * quote is needed, so a value containing the delimiter, a quote or a newline survives
 * the round trip (RFC 4180).
 */
export function renderTable(dataset: Dataset, delimiter: string, header: boolean): string {
  const body = dataset.rows.map((row) => rowValues(row, dataset.columns));
  const data = header ? [dataset.columns.map((column) => column.name), ...body] : body;
  return unparse(data, { delimiter, newline: '\n' });
}
