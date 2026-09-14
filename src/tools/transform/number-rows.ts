import { makeRow } from '../../core/model';
import { booleanOption, numberOption, stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { freeColumnId, rowsPhrase, targetColumn, withColumns } from '../helpers';

const strings = en.tools.numberRows;

export const numberRowsTool: Tool = {
  id: 'number-rows',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['number', 'index', 'count', 'enumerate', 'position'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column' },
    { key: 'start', label: strings.start, type: 'number', default: 1 },
    { key: 'asColumn', label: strings.asColumn, type: 'boolean', default: true },
    { key: 'separator', label: strings.separator, type: 'text', default: '. ' },
  ],
  run(input, options) {
    const start = Math.trunc(numberOption(options, 'start', 1));
    const asColumn = booleanOption(options, 'asColumn', true);
    const separator = stringOption(options, 'separator', '. ');
    const source = targetColumn(input, options);

    if (asColumn) {
      const column = { id: freeColumnId(input, 'no'), name: strings.numberColumn };
      const rows = input.rows.map((row, index) =>
        makeRow(index, { ...row.cells, [column.id]: String(start + index) }),
      );
      return {
        output: withColumns(input, [column, ...input.columns], rows),
        summary: format(strings.summary, { rows: rowsPhrase(rows.length) }),
        stats: { rows: rows.length },
      };
    }

    if (source === undefined) return { output: input, summary: en.tools.nothingChanged };

    const rows = input.rows.map((row, index) =>
      makeRow(index, {
        ...row.cells,
        [source.id]: `${start + index}${separator}${row.cells[source.id] ?? ''}`,
      }),
    );

    return {
      output: withColumns(input, input.columns, rows),
      summary: format(strings.summary, { rows: rowsPhrase(rows.length) }),
      stats: { rows: rows.length },
    };
  },
};
