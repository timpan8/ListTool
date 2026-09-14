import { makeRow } from '../../core/model';
import type { Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { targetColumn, withColumns } from '../helpers';

const strings = en.tools.removeColumn;

export const removeColumnTool: Tool = {
  id: 'remove-column',
  name: strings.name,
  category: 'columns',
  description: strings.description,
  keywords: ['remove', 'delete', 'drop', 'column'],
  arity: 'single',
  options: [{ key: 'column', label: en.tools.shared.column, type: 'column' }],
  appliesTo(input) {
    return input.columns.length >= 2;
  },
  run(input, options) {
    const target = targetColumn(input, options);
    if (target === undefined || input.columns.length < 2) {
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.lastColumn] };
    }

    const columns = input.columns.filter((column) => column.id !== target.id);
    const rows = input.rows.map((row, index) => {
      const cells = { ...row.cells };
      delete cells[target.id];
      return makeRow(index, cells);
    });

    return {
      output: withColumns(input, columns, rows),
      summary: format(strings.summary, { name: target.name }),
    };
  },
};
