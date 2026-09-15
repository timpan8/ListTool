import { cell, type Row } from '../../core/model';
import { joinKeys, normalizeKey } from '../../core/normalize';
import { booleanOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { freeColumnId, targetColumns, withColumns } from '../helpers';

const strings = en.tools.findDuplicates;

export const findDuplicatesTool: Tool = {
  id: 'find-duplicates',
  name: strings.name,
  category: 'clean',
  description: strings.description,
  keywords: ['duplicate', 'count', 'repeat', 'report', 'find'],
  arity: 'single',
  options: [
    {
      key: 'column',
      label: en.tools.shared.keyColumn,
      type: 'column',
      default: '',
      allowAll: true,
    },
    { key: 'trim', label: en.tools.shared.trim, type: 'boolean', default: true },
    { key: 'ignoreCase', label: en.tools.shared.ignoreCase, type: 'boolean', default: true },
    { key: 'onlyDuplicates', label: strings.onlyDuplicates, type: 'boolean', default: true },
  ],
  run(input, options) {
    const columns = targetColumns(input, options);
    const normalize = {
      trim: booleanOption(options, 'trim', true),
      ignoreCase: booleanOption(options, 'ignoreCase', true),
    };

    const keyOf = (row: Row): string =>
      joinKeys(columns.map((column) => normalizeKey(cell(row, column.id), normalize)));

    const counts = new Map<string, number>();
    for (const row of input.rows) {
      const key = keyOf(row);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const countColumn = { id: freeColumnId(input, 'count'), name: strings.countColumn };
    const onlyDuplicates = booleanOption(options, 'onlyDuplicates', true);

    // Reporting, not removing: every kept row stays where it was and gains its count.
    const rows = input.rows
      .filter((row) => !onlyDuplicates || (counts.get(keyOf(row)) ?? 0) > 1)
      .map((row) => ({
        id: row.id,
        cells: { ...row.cells, [countColumn.id]: String(counts.get(keyOf(row)) ?? 0) },
      }));

    const repeated = [...counts.values()].filter((count) => count > 1).length;

    return {
      output: withColumns(input, [...input.columns, countColumn], rows),
      summary: format(strings.summary, { groups: plural(repeated, strings.groups) }),
      stats: { repeated },
    };
  },
};
