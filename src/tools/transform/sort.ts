import { cell } from '../../core/model';
import { booleanOption, stringOption, type Tool } from '../../core/registry';
import { DEFAULT_LOCALE, sortBy, sortByLength } from '../../core/sort';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { rowsPhrase, targetColumn, withRows } from '../helpers';

const strings = en.tools.sort;

export const sortTool: Tool = {
  id: 'sort',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['sort', 'order', 'alphabetical', 'az', 'za', 'length'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column' },
    {
      key: 'direction',
      label: strings.direction,
      type: 'select',
      default: 'asc',
      choices: [
        { value: 'asc', label: strings.ascending },
        { value: 'desc', label: strings.descending },
      ],
    },
    {
      key: 'by',
      label: strings.by,
      type: 'select',
      default: 'value',
      choices: [
        { value: 'value', label: strings.byValue },
        { value: 'length', label: strings.byLength },
      ],
    },
    {
      key: 'locale',
      label: strings.locale,
      type: 'select',
      default: DEFAULT_LOCALE,
      choices: [
        { value: 'sv', label: strings.localeSv },
        { value: 'en', label: strings.localeEn },
      ],
    },
    { key: 'numeric', label: strings.numeric, type: 'boolean', default: true },
  ],
  run(input, options) {
    const column = targetColumn(input, options);
    if (column === undefined) {
      return { output: input, summary: en.tools.nothingChanged };
    }

    const descending = stringOption(options, 'direction', 'asc') === 'desc';
    const sortOptions = {
      locale: stringOption(options, 'locale', DEFAULT_LOCALE),
      numeric: booleanOption(options, 'numeric', true),
      descending,
    };
    const key = (row: (typeof input.rows)[number]): string => cell(row, column.id);

    const rows =
      stringOption(options, 'by', 'value') === 'length'
        ? sortByLength(input.rows, key, sortOptions)
        : sortBy(input.rows, key, sortOptions);

    return {
      output: withRows(input, rows),
      summary: format(strings.summary, {
        rows: rowsPhrase(rows.length),
        column: column.name,
        direction: descending ? strings.descending : strings.ascending,
      }),
      stats: { rows: rows.length },
    };
  },
};
