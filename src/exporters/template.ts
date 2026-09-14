import { cell, type Dataset } from '../core/model';
import { booleanOption, stringOption, type Exporter, type Options } from '../core/registry';
import { en } from '../i18n/en';

const strings = en.exporters.template;

/** `{column id}` — the same placeholder shape the rest of the app uses. */
const PLACEHOLDER = /\{([\w.-]+)\}/g;

const DEFAULT_ROW = '{value}';

function fill(template: string, dataset: Dataset, values: Record<string, string>, keepUnknown: boolean): string {
  const known = new Set(dataset.columns.map((column) => column.id));
  return template.replace(PLACEHOLDER, (match, key: string) => {
    if (known.has(key)) return values[key] ?? '';
    // An unknown placeholder is usually a typo, so it is shown rather than swallowed.
    return keepUnknown ? match : '';
  });
}

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
      .map((row) => {
        const values: Record<string, string> = {};
        for (const column of dataset.columns) values[column.id] = cell(row, column.id);
        return fill(template, dataset, values, keepUnknown);
      })
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
