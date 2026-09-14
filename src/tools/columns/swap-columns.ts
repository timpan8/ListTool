import { cell } from '../../core/model';
import { stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { rowsPhrase, withRows } from '../helpers';

const strings = en.tools.swap;

export const swapColumnsTool: Tool = {
  id: 'swap-columns',
  name: strings.name,
  category: 'columns',
  description: strings.description,
  keywords: ['swap', 'first', 'last', 'name', 'order', 'exchange', 'switch'],
  arity: 'single',
  options: [
    { key: 'columnA', label: strings.columnA, type: 'column', default: 'first' },
    { key: 'columnB', label: strings.columnB, type: 'column', default: 'last' },
  ],
  appliesTo(input) {
    return input.columns.length >= 2;
  },
  run(input, options) {
    const columns = input.columns;
    const a = columns.find((column) => column.id === stringOption(options, 'columnA', '')) ??
      columns[0];
    const b = columns.find((column) => column.id === stringOption(options, 'columnB', '')) ??
      columns[1];

    if (a === undefined || b === undefined || a.id === b.id) {
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.same] };
    }

    // The values move, the columns stay where they are: a swap, not a reorder.
    const rows = input.rows.map((row) => ({
      id: row.id,
      cells: { ...row.cells, [a.id]: cell(row, b.id), [b.id]: cell(row, a.id) },
    }));

    return {
      output: withRows(input, rows),
      summary: format(strings.summary, {
        a: a.name,
        b: b.name,
        rows: rowsPhrase(rows.length),
      }),
      stats: { rows: rows.length },
    };
  },
};
