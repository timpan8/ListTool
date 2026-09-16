import { cell, type Row } from '../../core/model';
import { stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { cellsPhrase, targetColumns, withRows } from '../helpers';

const strings = en.tools.fillDown;

export const fillDownTool: Tool = {
  id: 'fill-down',
  name: strings.name,
  category: 'clean',
  description: strings.description,
  keywords: ['fill', 'down', 'up', 'empty', 'blank', 'merged', 'cells', 'repeat', 'above'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column', default: '', allowAll: true },
    {
      key: 'direction',
      label: strings.direction,
      type: 'select',
      default: 'down',
      choices: [
        { value: 'down', label: strings.above },
        { value: 'up', label: strings.below },
      ],
    },
  ],
  run(input, options) {
    const columns = targetColumns(input, options);
    const upwards = stringOption(options, 'direction', 'down') === 'up';
    // Walking from the bottom fills upwards; the last filled value seen is the one taken.
    const order = upwards ? [...input.rows].reverse() : input.rows;
    const filled = new Map<string, Record<string, string>>();
    let changed = 0;

    const last: Record<string, string> = {};
    for (const row of order) {
      for (const column of columns) {
        const value = cell(row, column.id);
        if (value.trim() !== '') {
          last[column.id] = value;
          continue;
        }
        const take = last[column.id];
        if (take === undefined) continue;
        const cells = filled.get(row.id) ?? {};
        cells[column.id] = take;
        filled.set(row.id, cells);
        changed += 1;
      }
    }

    if (changed === 0) {
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.nothing] };
    }

    const rows: Row[] = input.rows.map((row) => {
      const cells = filled.get(row.id);
      return cells === undefined ? row : { id: row.id, cells: { ...row.cells, ...cells } };
    });

    return {
      output: withRows(input, rows),
      summary: format(strings.summary, { cells: cellsPhrase(changed) }),
      stats: { changed },
    };
  },
};
