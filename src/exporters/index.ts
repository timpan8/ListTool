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
  templateExporter,
];

export function exporterById(id: string): Exporter | undefined {
  return exporters.find((exporter) => exporter.id === id);
}

/** The exporter behind the toolbar's one-click Copy, and the one dialogs open on. */
export const defaultExporter: Exporter = linesExporter;
export const DEFAULT_EXPORTER_ID = defaultExporter.id;
