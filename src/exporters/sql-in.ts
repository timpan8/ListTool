import type { Exporter } from '../core/registry';
import { columnValues } from './column';
import { ui } from '../i18n';

/** SQL escapes a single quote by doubling it. */
function quote(value: string): string {
  return `'${value.split("'").join("''")}'`;
}

export const sqlInExporter: Exporter = {
  id: 'sql-in',
  name: ui.exporters.sqlIn.name,
  options: [{ key: 'column', label: ui.exporters.sqlIn.column, type: 'column' }],
  render(dataset, options) {
    return `(${columnValues(dataset, options).map(quote).join(', ')})`;
  },
};
