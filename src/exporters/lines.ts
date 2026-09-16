import type { Exporter } from '../core/registry';
import { columnValues, selectedColumn } from './column';
import { renderHtmlTable } from './html-table';
import { ui } from '../i18n';

export const linesExporter: Exporter = {
  id: 'lines',
  name: ui.exporters.lines.name,
  options: [{ key: 'column', label: ui.exporters.lines.column, type: 'column' }],
  render(dataset, options) {
    return columnValues(dataset, options).join('\n');
  },
  // One column is still a table: pasting a list into Excel should fill a column, not a
  // single cell with newlines in it.
  html(dataset, options) {
    const id = selectedColumn(dataset, options);
    const column = dataset.columns.find((candidate) => candidate.id === id);
    return column === undefined ? '' : renderHtmlTable(dataset, [column], false);
  },
};
