import { booleanOption, type Exporter } from '../core/registry';
import { renderTable } from './table-text';
import { en } from '../i18n/en';

export const tsvExporter: Exporter = {
  id: 'tsv',
  name: en.exporters.tsv.name,
  extension: 'tsv',
  options: [{ key: 'header', label: en.exporters.tsv.header, type: 'boolean', default: true }],
  render(dataset, options) {
    return renderTable(dataset, '\t', booleanOption(options, 'header', true));
  },
};
