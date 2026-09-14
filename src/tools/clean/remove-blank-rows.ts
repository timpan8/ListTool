import { cell, isBlankRow } from '../../core/model';
import type { Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { rowsPhrase, targetColumns, withRows } from '../helpers';

const strings = en.tools.removeBlank;

export const removeBlankRowsTool: Tool = {
  id: 'remove-blank-rows',
  name: strings.name,
  category: 'clean',
  description: strings.description,
  keywords: ['blank', 'empty', 'remove', 'drop', 'clean'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column', default: '', allowAll: true },
  ],
  run(input, options) {
    const columns = targetColumns(input, options);
    const kept = input.rows.filter((row) =>
      columns.length === input.columns.length
        ? !isBlankRow(row, input.columns)
        : columns.some((column) => cell(row, column.id).trim() !== ''),
    );
    const removed = input.rows.length - kept.length;

    return {
      output: withRows(input, kept),
      summary:
        removed === 0
          ? en.tools.nothingChanged
          : format(strings.summary, {
              removed: plural(removed, strings.blankRows),
              before: rowsPhrase(input.rows.length),
              after: rowsPhrase(kept.length),
            }),
      stats: { removed },
    };
  },
  check(input) {
    const blank = input.rows.filter((row) => isBlankRow(row, input.columns)).length;
    if (blank === 0) return null;
    return { summary: plural(blank, strings.found), count: blank, options: { column: '' } };
  },
};
