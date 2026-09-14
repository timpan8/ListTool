import type { Exporter } from '../core/registry';
import { columnValues } from './column';
import { en } from '../i18n/en';

/** SQL escapes a single quote by doubling it. */
function quote(value: string): string {
  return `'${value.split("'").join("''")}'`;
}

export const sqlInExporter: Exporter = {
  id: 'sql-in',
  name: en.exporters.sqlIn.name,
  options: [{ key: 'column', label: en.exporters.sqlIn.column, type: 'column' }],
  render(dataset, options) {
    return `(${columnValues(dataset, options).map(quote).join(', ')})`;
  },
};
