import { cell, type Row } from '../../core/model';
import { joinKeys, normalizeKey } from '../../core/normalize';
import { booleanOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format, plural } from '../../i18n/format';
import {
  freeColumnId,
  NORMALIZE_FIELDS,
  readNormalize,
  targetColumns,
  withColumns,
} from '../helpers';

const strings = ui.tools.findDuplicates;

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
      label: ui.tools.shared.keyColumn,
      type: 'column',
      default: '',
      allowAll: true,
    },
    { key: 'onlyDuplicates', label: strings.onlyDuplicates, type: 'boolean', default: true },
    ...NORMALIZE_FIELDS,
  ],
  run(input, options) {
    const columns = targetColumns(input, options);
    const normalize = readNormalize(options);

    const keyOf = (row: Row): string =>
      joinKeys(columns.map((column) => normalizeKey(cell(row, column.id), normalize)));

    // Each key is built once: a long list normalises every cell exactly one time.
    const keys = input.rows.map(keyOf);
    const counts = new Map<string, number>();
    for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);

    const countColumn = { id: freeColumnId(input, 'count'), name: strings.countColumn };
    const onlyDuplicates = booleanOption(options, 'onlyDuplicates', true);

    // Reporting, not removing: every kept row stays where it was and gains its count.
    const rows: Row[] = [];
    input.rows.forEach((row, index) => {
      const count = counts.get(keys[index] ?? '') ?? 0;
      if (onlyDuplicates && count <= 1) return;
      rows.push({ id: row.id, cells: { ...row.cells, [countColumn.id]: String(count) } });
    });

    const repeated = [...counts.values()].filter((count) => count > 1).length;

    return {
      output: withColumns(input, [...input.columns, countColumn], rows),
      summary: format(strings.summary, { groups: plural(repeated, strings.groups) }),
      stats: { repeated },
    };
  },
};
