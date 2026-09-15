import { cell } from '../../core/model';
import { stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { freeColumnId, withColumns } from '../helpers';

const strings = en.tools.mergeColumns;

export const mergeColumnsTool: Tool = {
  id: 'merge-columns',
  name: strings.name,
  category: 'columns',
  description: strings.description,
  keywords: ['merge', 'join', 'combine', 'concatenate', 'columns'],
  arity: 'single',
  options: [
    { key: 'columnA', label: strings.columnA, type: 'column' },
    { key: 'columnB', label: strings.columnB, type: 'column' },
    { key: 'separator', label: strings.separator, type: 'text', default: ' ' },
    { key: 'name', label: strings.into, type: 'text', default: '' },
  ],
  appliesTo(input) {
    return input.columns.length >= 2;
  },
  run(input, options) {
    const a = input.columns.find((column) => column.id === stringOption(options, 'columnA', ''))
      ?? input.columns[0];
    const b = input.columns.find((column) => column.id === stringOption(options, 'columnB', ''))
      ?? input.columns[1];
    if (a === undefined || b === undefined || a.id === b.id) {
      return { output: input, summary: en.tools.nothingChanged, warnings: [en.tools.swap.same] };
    }

    const separator = stringOption(options, 'separator', ' ');
    const typed = stringOption(options, 'name', '').trim();
    const target = {
      id: freeColumnId(input, `${a.id}_${b.id}`),
      name: typed === '' ? `${a.name}${separator}${b.name}` : typed,
    };

    // An empty half must not leave a dangling separator.
    const rows = input.rows.map((row) => {
      const parts = [cell(row, a.id), cell(row, b.id)].filter((value) => value !== '');
      return { id: row.id, cells: { ...row.cells, [target.id]: parts.join(separator) } };
    });

    return {
      output: withColumns(input, [...input.columns, target], rows),
      summary: format(strings.summary, { a: a.name, b: b.name, name: target.name }),
      stats: { rows: rows.length },
    };
  },
};
