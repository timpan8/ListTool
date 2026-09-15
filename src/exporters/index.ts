import type { Dataset } from '../core/model';
import type { Exporter } from '../core/registry';
import { linesExporter } from './lines';
import { joinedLineExporter } from './joined-line';
import { quotedJoinExporter } from './quoted-join';
import { csvExporter } from './csv';
import { tsvExporter } from './tsv';
import { jsonExporter } from './json';
import { powershellExporter } from './powershell';
import { sqlInExporter } from './sql-in';
import { markdownExporter } from './markdown';
import { recipientsExporter } from './recipients';
import { templateExporter } from './template';

/**
 * The exporter registry. Adding an exporter means adding one module, its test, and one
 * line here — the shell is never edited for it.
 */
export const exporters: Exporter[] = [
  linesExporter,
  joinedLineExporter,
  quotedJoinExporter,
  csvExporter,
  tsvExporter,
  jsonExporter,
  powershellExporter,
  sqlInExporter,
  markdownExporter,
  recipientsExporter,
  templateExporter,
];

export function exporterById(id: string): Exporter | undefined {
  return exporters.find((exporter) => exporter.id === id);
}

/** True for an exporter that writes the whole table: it asks which columns to include. */
export function isTableExporter(exporter: Exporter): boolean {
  return exporter.options.some((field) => field.type === 'columns');
}

/**
 * The exporter behind one-click Copy. A table is copied as a table — tab-separated text
 * plus the HTML flavour, so a paste into Excel lands in cells — and a plain list as
 * lines. The decision lives here so the shell never reasons about column counts.
 */
export function copyExporter(dataset: Dataset): Exporter {
  return dataset.columns.length > 1 ? tsvExporter : linesExporter;
}
