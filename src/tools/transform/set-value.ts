import { stringOption, stringsOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format } from '../../i18n/format';
import { cellsPhrase, targetColumn, withRows } from '../helpers';

const strings = ui.tools.setValue;

export const setValueTool: Tool = {
  id: 'set-value',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['set', 'edit', 'write', 'fill', 'change', 'value', 'cell', 'selected'],
  arity: 'single',
  options: [
    { key: 'rows', label: strings.rows, type: 'rows' },
    { key: 'column', label: ui.tools.shared.column, type: 'column' },
    { key: 'value', label: strings.value, type: 'text', default: '' },
  ],
  run(input, options) {
    const column = targetColumn(input, options);
    const chosen = new Set(stringsOption(options, 'rows', []));
    if (column === undefined || chosen.size === 0) {
      return { output: input, summary: ui.tools.nothingChanged };
    }

    const value = stringOption(options, 'value', '');
    let changed = 0;

    const rows = input.rows.map((row) => {
      if (!chosen.has(row.id) || row.cells[column.id] === value) return row;
      changed += 1;
      return { id: row.id, cells: { ...row.cells, [column.id]: value } };
    });

    if (changed === 0) return { output: input, summary: ui.tools.nothingChanged };

    return {
      output: withRows(input, rows),
      summary: format(strings.summary, {
        cells: cellsPhrase(changed),
        value: value === '' ? strings.empty : value,
      }),
      stats: { changed },
    };
  },
};
