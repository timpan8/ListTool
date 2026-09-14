import type { Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { cellsPhrase, mapCells, targetColumns, withRows } from '../helpers';

const strings = en.tools.trim;

export const trimTool: Tool = {
  id: 'trim-whitespace',
  name: strings.name,
  category: 'clean',
  description: strings.description,
  keywords: ['trim', 'whitespace', 'space', 'strip', 'clean'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column', default: '', allowAll: true },
  ],
  run(input, options) {
    const columns = targetColumns(input, options);
    const { rows, changed } = mapCells(input, columns, (value) => value.trim());

    return {
      output: withRows(input, rows),
      summary:
        changed === 0
          ? en.tools.nothingChanged
          : format(strings.summary, { cells: cellsPhrase(changed) }),
      stats: { changed },
    };
  },
};
