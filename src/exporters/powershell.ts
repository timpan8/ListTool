import type { Exporter } from '../core/registry';
import { columnValues } from './column';
import { en } from '../i18n/en';

/** PowerShell escapes a single quote inside a single-quoted string by doubling it. */
function quote(value: string): string {
  return `'${value.split("'").join("''")}'`;
}

export const powershellExporter: Exporter = {
  id: 'powershell',
  name: en.exporters.powershell.name,
  options: [{ key: 'column', label: en.exporters.powershell.column, type: 'column' }],
  render(dataset, options) {
    return `@(${columnValues(dataset, options).map(quote).join(', ')})`;
  },
};
