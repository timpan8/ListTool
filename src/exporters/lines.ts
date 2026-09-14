import type { Exporter } from '../core/registry';
import { columnValues } from './column';
import { en } from '../i18n/en';

export const linesExporter: Exporter = {
  id: 'lines',
  name: en.exporters.lines.name,
  options: [{ key: 'column', label: en.exporters.lines.column, type: 'column' }],
  render(dataset, options) {
    return columnValues(dataset, options).join('\n');
  },
};
