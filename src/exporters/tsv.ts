import { booleanOption, type Exporter } from '../core/registry';
import { chosenColumns, renderTable } from './table-text';
import { en } from '../i18n/en';

export const tsvExporter: Exporter = {
  id: 'tsv',
  name: en.exporters.tsv.name,
  extension: 'tsv',
  options: [
    { key: 'columns', label: en.exporters.shared.columns, type: 'columns' },
    { key: 'header', label: en.exporters.tsv.header, type: 'boolean', default: true },
  ],
  render(dataset, options) {
    return renderTable(
      dataset,
      chosenColumns(dataset, options),
      '\t',
      booleanOption(options, 'header', true),
    );
  },
};
