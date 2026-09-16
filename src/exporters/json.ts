import { cell } from '../core/model';
import { booleanOption, type Exporter } from '../core/registry';
import { columnValues } from './column';
import { ui } from '../i18n';

export const jsonExporter: Exporter = {
  id: 'json',
  name: ui.exporters.json.name,
  extension: 'json',
  options: [
    { key: 'column', label: ui.exporters.json.column, type: 'column' },
    { key: 'asObjects', label: ui.exporters.json.asObjects, type: 'boolean', default: false },
  ],
  render(dataset, options) {
    if (booleanOption(options, 'asObjects', false)) {
      const rows = dataset.rows.map((row) =>
        Object.fromEntries(dataset.columns.map((column) => [column.name, cell(row, column.id)])),
      );
      return JSON.stringify(rows, null, 2);
    }
    return JSON.stringify(columnValues(dataset, options), null, 2);
  },
};
