import { cell, makeRow, type Column, type Row } from '../../core/model';
import { booleanOption, stringOption, stringsOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { withColumns } from '../helpers';

const strings = en.tools.unpivot;

export const unpivotTool: Tool = {
  id: 'unpivot',
  name: strings.name,
  category: 'columns',
  description: strings.description,
  keywords: ['unpivot', 'melt', 'wide', 'long', 'columns to rows', 'months', 'reshape'],
  arity: 'single',
  appliesTo: (input) => input.columns.length >= 2,
  options: [
    { key: 'keep', label: strings.keep, type: 'columns' },
    { key: 'nameColumn', label: strings.nameColumn, type: 'text', default: strings.defaultName },
    { key: 'valueColumn', label: strings.valueColumn, type: 'text', default: strings.defaultValue },
    { key: 'dropEmpty', label: strings.dropEmpty, type: 'boolean', default: true },
  ],
  run(input, options) {
    // No choice yet means keep the first column: a table of months usually has one
    // label column, and that is nearly always the right guess to start from.
    const keepIds = stringsOption(options, 'keep', [input.columns[0]?.id ?? '']);
    const keep = input.columns.filter((column) => keepIds.includes(column.id));
    const turn = input.columns.filter((column) => !keepIds.includes(column.id));

    if (turn.length === 0) {
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.keepAll] };
    }

    const nameId = 'field';
    const valueId = 'value';
    const dropEmpty = booleanOption(options, 'dropEmpty', true);

    const columns: Column[] = [
      ...keep,
      { id: nameId, name: stringOption(options, 'nameColumn', strings.defaultName) },
      { id: valueId, name: stringOption(options, 'valueColumn', strings.defaultValue) },
    ];

    const rows: Row[] = [];
    for (const row of input.rows) {
      for (const column of turn) {
        const value = cell(row, column.id);
        if (dropEmpty && value.trim() === '') continue;
        const cells: Record<string, string> = {};
        for (const kept of keep) cells[kept.id] = cell(row, kept.id);
        cells[nameId] = column.name;
        cells[valueId] = value;
        rows.push(makeRow(rows.length, cells));
      }
    }

    return {
      output: withColumns(input, columns, rows),
      summary: format(strings.summary, {
        columns: plural(turn.length, strings.turned),
        rows: plural(rows.length, strings.produced),
      }),
      stats: { columns: turn.length, rows: rows.length },
    };
  },
};
