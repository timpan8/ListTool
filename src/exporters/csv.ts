import { booleanOption, type Exporter } from '../core/registry';
import { renderTable } from './table-text';
import { en } from '../i18n/en';

export const csvExporter: Exporter = {
  id: 'csv',
  name: en.exporters.csv.name,
  extension: 'csv',
  options: [{ key: 'header', label: en.exporters.csv.header, type: 'boolean', default: true }],
  render(dataset, options) {
    return renderTable(dataset, ',', booleanOption(options, 'header', true));
  },
};
