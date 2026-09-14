import { booleanOption, type Exporter } from '../core/registry';
import { chosenColumns, renderTable } from './table-text';
import { en } from '../i18n/en';

export const csvExporter: Exporter = {
  id: 'csv',
  name: en.exporters.csv.name,
  extension: 'csv',
  options: [
    { key: 'columns', label: en.exporters.shared.columns, type: 'columns' },
    { key: 'header', label: en.exporters.csv.header, type: 'boolean', default: true },
  ],
  render(dataset, options) {
    return renderTable(
      dataset,
      chosenColumns(dataset, options),
      ',',
      booleanOption(options, 'header', true),
    );
  },
};
