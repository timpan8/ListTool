import { booleanOption, type Exporter } from '../core/registry';
import { renderHtmlTable } from './html-table';
import { chosenColumns, renderTable } from './table-text';
import { ui } from '../i18n';

export const csvExporter: Exporter = {
  id: 'csv',
  name: ui.exporters.csv.name,
  extension: 'csv',
  options: [
    { key: 'columns', label: ui.exporters.shared.columns, type: 'columns' },
    { key: 'header', label: ui.exporters.csv.header, type: 'boolean', default: true },
  ],
  render(dataset, options) {
    return renderTable(
      dataset,
      chosenColumns(dataset, options),
      ',',
      booleanOption(options, 'header', true),
    );
  },
  html(dataset, options) {
    return renderHtmlTable(
      dataset,
      chosenColumns(dataset, options),
      booleanOption(options, 'header', true),
    );
  },
};
