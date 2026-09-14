import { cell, makeRow } from '../../core/model';
import { stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { freeColumnId, rowsPhrase, withColumns } from '../helpers';

const strings = en.tools.displayName;

export const buildDisplayNameTool: Tool = {
  id: 'build-display-name',
  name: strings.name,
  category: 'columns',
  description: strings.description,
  keywords: ['display', 'name', 'full', 'combine', 'first', 'last'],
  arity: 'single',
  options: [
    { key: 'first', label: en.columns.first, type: 'column', default: 'first' },
    { key: 'last', label: en.columns.last, type: 'column', default: 'last' },
    {
      key: 'order',
      label: strings.order,
      type: 'select',
      default: 'first-last',
      choices: [
        { value: 'first-last', label: strings.firstLast },
        { value: 'last-first', label: strings.lastFirst },
        { value: 'last-comma-first', label: strings.lastCommaFirst },
      ],
    },
    { key: 'separator', label: strings.separator, type: 'text', default: ' ' },
  ],
  appliesTo(input) {
    return input.columns.length >= 2;
  },
  run(input, options) {
    const firstId = stringOption(options, 'first', 'first');
    const lastId = stringOption(options, 'last', 'last');
    const order = stringOption(options, 'order', 'first-last');
    const separator = stringOption(options, 'separator', ' ');

    const target = { id: freeColumnId(input, 'display'), name: strings.columnName };

    const rows = input.rows.map((row, index) => {
      const first = cell(row, firstId);
      const last = cell(row, lastId);
      const parts =
        order === 'first-last' ? [first, last] : order === 'last-first' ? [last, first] : null;

      // "Last, First" always uses a comma, whatever the separator is for the other orders.
      const value =
        parts === null
          ? [last, first].filter((part) => part !== '').join(', ')
          : parts.filter((part) => part !== '').join(separator);

      return makeRow(index, { ...row.cells, [target.id]: value });
    });

    return {
      output: withColumns(input, [...input.columns, target], rows),
      summary: format(strings.summary, {
        name: target.name,
        rows: rowsPhrase(rows.length),
      }),
      stats: { rows: rows.length },
    };
  },
};
