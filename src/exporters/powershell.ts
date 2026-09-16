import type { Exporter } from '../core/registry';
import { columnValues } from './column';
import { ui } from '../i18n';

/** PowerShell escapes a single quote inside a single-quoted string by doubling it. */
function quote(value: string): string {
  return `'${value.split("'").join("''")}'`;
}

export const powershellExporter: Exporter = {
  id: 'powershell',
  name: ui.exporters.powershell.name,
  options: [{ key: 'column', label: ui.exporters.powershell.column, type: 'column' }],
  render(dataset, options) {
    return `@(${columnValues(dataset, options).map(quote).join(', ')})`;
  },
};
