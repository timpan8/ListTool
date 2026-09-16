import { cell, type Column, type Row } from '../../core/model';
import { stringOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format, plural } from '../../i18n/format';
import { freeColumnId, targetColumn, withColumns } from '../helpers';

const strings = ui.tools.splitColumn;

export const splitColumnTool: Tool = {
  id: 'split-column',
  name: strings.name,
  category: 'columns',
  description: strings.description,
  keywords: ['split', 'column', 'divide', 'separate', 'delimiter'],
  arity: 'single',
  options: [
    { key: 'column', label: ui.tools.shared.column, type: 'column' },
    { key: 'delimiter', label: ui.parsers.delimited.delimiter, type: 'delimiter', default: ' ' },
  ],
  run(input, options) {
    const source = targetColumn(input, options);
    const delimiter = stringOption(options, 'delimiter', ' ');
    if (source === undefined || delimiter === '') {
      return { output: input, summary: ui.tools.nothingChanged };
    }

    const parts = input.rows.map((row) => cell(row, source.id).split(delimiter));
    const width = parts.reduce((widest, values) => Math.max(widest, values.length), 1);
    if (width < 2) {
      return { output: input, summary: ui.tools.nothingChanged, warnings: [strings.nothing] };
    }

    // The source column keeps its id and its first part; the rest become new columns.
    const extras: Column[] = [];
    for (let index = 1; index < width; index += 1) {
      const id = freeColumnId(
        { ...input, columns: [...input.columns, ...extras] },
        `${source.id}_${index + 1}`,
      );
      extras.push({ id, name: format(ui.columns.part, { name: source.name, n: index + 1 }) });
    }

    const rows: Row[] = input.rows.map((row, rowIndex) => {
      const values = parts[rowIndex] ?? [];
      const cells: Record<string, string> = { ...row.cells, [source.id]: values[0] ?? '' };
      extras.forEach((column, index) => {
        cells[column.id] = values[index + 1] ?? '';
      });
      return { id: row.id, cells };
    });

    const columns = [...input.columns];
    columns.splice(columns.indexOf(source) + 1, 0, ...extras);

    return {
      output: withColumns(input, columns, rows),
      summary: format(strings.summary, {
        column: source.name,
        parts: plural(width, strings.parts),
      }),
      stats: { columns: width },
    };
  },
};
