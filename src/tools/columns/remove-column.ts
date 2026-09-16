import { cell } from '../../core/model';
import type { Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
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
    const rows = input.rows.map((row) => {
      const cells = { ...row.cells };
      delete cells[target.id];
      return { id: row.id, cells };
    });

    return {
      output: withColumns(input, columns, rows),
      summary: format(strings.summary, { name: target.name }),
    };
  },
  check(input) {
    // A column with nothing in it, on a list that has rows, is only in the way.
    if (input.rows.length === 0 || input.columns.length < 2) return null;
    const empty = input.columns.filter((column) =>
      input.rows.every((row) => cell(row, column.id).trim() === ''),
    );
    if (empty.length === 0 || empty.length === input.columns.length) return null;
    return {
      summary: plural(empty.length, strings.found),
      count: empty.length,
      options: { column: empty[0]?.id ?? '' },
    };
  },
};
