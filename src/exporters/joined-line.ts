import { stringOption, type Exporter } from '../core/registry';
import { columnValues } from './column';
import { en } from '../i18n/en';

export const joinedLineExporter: Exporter = {
  id: 'joined-line',
  name: en.exporters.joinedLine.name,
  options: [
    { key: 'column', label: en.exporters.joinedLine.column, type: 'column' },
    {
      key: 'delimiter',
      label: en.exporters.joinedLine.delimiter,
      type: 'delimiter',
      default: ', ',
    },
  ],
  render(dataset, options) {
    return columnValues(dataset, options).join(stringOption(options, 'delimiter', ', '));
  },
};
