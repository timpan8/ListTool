import { cell } from '../../core/model';
import type { Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { cellsPhrase, mapCells, targetColumns, withRows } from '../helpers';

const strings = en.tools.collapse;

export const collapseWhitespaceTool: Tool = {
  id: 'collapse-whitespace',
  name: strings.name,
  category: 'clean',
  description: strings.description,
  keywords: ['collapse', 'whitespace', 'space', 'double', 'tidy'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column', default: '', allowAll: true },
  ],
  run(input, options) {
    const columns = targetColumns(input, options);
    const { rows, changed } = mapCells(input, columns, (value) =>
      value.replace(/\s+/g, ' ').trim(),
    );

    return {
      output: changed === 0 ? input : withRows(input, rows),
      summary:
        changed === 0
          ? en.tools.nothingChanged
          : format(strings.summary, { cells: cellsPhrase(changed) }),
      stats: { changed },
    };
  },
  check(input) {
    // Only a run of whitespace INSIDE the value is reported. Space around it is what
    // Trim finds, and one cell should not turn up twice in the same list of findings.
    const cells = input.rows.reduce(
      (count, row) =>
        count +
        input.columns.filter((column) => /\s\s|\t/.test(cell(row, column.id).trim())).length,
      0,
    );
    if (cells === 0) return null;
    return { summary: plural(cells, strings.found), count: cells, options: { column: '' } };
  },
};
