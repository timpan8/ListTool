import type { Dataset } from '../core/model';
import { booleanOption, stringOption, type Exporter, type Options } from '../core/registry';
import { fillTemplate } from '../core/template';
import { en } from '../i18n/en';

const strings = en.exporters.template;

const DEFAULT_ROW = '{value}';

export const templateExporter: Exporter = {
  id: 'template',
  name: strings.name,
  extension: 'txt',
  options: [
    { key: 'row', label: strings.row, type: 'text', default: DEFAULT_ROW, help: strings.rowHelp },
    { key: 'between', label: strings.between, type: 'delimiter', default: '\n' },
    { key: 'before', label: strings.before, type: 'text', default: '' },
    { key: 'after', label: strings.after, type: 'text', default: '' },
    { key: 'unknown', label: strings.unknown, type: 'boolean', default: true },
  ],
  render(dataset: Dataset, options: Options): string {
    const template = stringOption(options, 'row', DEFAULT_ROW);
    const keepUnknown = booleanOption(options, 'unknown', true);

    const body = dataset.rows
      .map((row) => fillTemplate(template, row, dataset.columns, keepUnknown))
      .join(stringOption(options, 'between', '\n'));

    return [
      stringOption(options, 'before', ''),
      body,
      stringOption(options, 'after', ''),
    ]
      .filter((part) => part !== '')
      .join('\n');
  },
};
