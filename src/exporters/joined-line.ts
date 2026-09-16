import { stringOption, type Exporter } from '../core/registry';
import { columnValues } from './column';
import { ui } from '../i18n';

export const joinedLineExporter: Exporter = {
  id: 'joined-line',
  name: ui.exporters.joinedLine.name,
  options: [
    { key: 'column', label: ui.exporters.joinedLine.column, type: 'column' },
    {
      key: 'delimiter',
      label: ui.exporters.joinedLine.delimiter,
      type: 'delimiter',
      default: ', ',
    },
  ],
  render(dataset, options) {
    return columnValues(dataset, options).join(stringOption(options, 'delimiter', ', '));
  },
};
