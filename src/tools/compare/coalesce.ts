import { cell, type Row } from '../../core/model';
import { joinKeys, normalizeKey } from '../../core/normalize';
import { booleanOption, stringsOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format, plural } from '../../i18n/format';
import { rowIdsAfter, withRows } from '../helpers';
import { KEY_FIELDS, NORMALIZE_FIELDS, readCompareOptions } from './shared';

const strings = ui.tools.coalesce;

export const coalesceTool: Tool = {
  id: 'coalesce',
  name: strings.name,
  category: 'compare',
  description: strings.description,
  keywords: ['coalesce', 'fill', 'merge', 'gaps', 'missing', 'combine', 'enrich', 'truth'],
  arity: 'dual',
  options: [
    ...KEY_FIELDS,
    { key: 'columns', label: strings.columns, type: 'columns' },
    { key: 'overwrite', label: strings.overwrite, type: 'boolean', default: false },
    { key: 'addMissing', label: strings.addMissing, type: 'boolean', default: false },
    ...NORMALIZE_FIELDS,
  ],
  run(input, options, second) {
    if (second === undefined) {
      return {
        output: input,
        summary: ui.tools.nothingChanged,
        warnings: [ui.tools.shared.secondListMissing],
      };
    }

    const { keyA, keyB, normalize } = readCompareOptions(options, input, second);
    const keyOf = (row: Row, ids: string[]): string =>
      joinKeys(ids.map((id) => normalizeKey(cell(row, id), normalize)));

    // Only a column both lists have can be filled from the other.
    const shared = new Set(second.columns.map((column) => column.id));
    const wanted = stringsOption(
      options,
      'columns',
      input.columns.filter((column) => shared.has(column.id)).map((column) => column.id),
    );
    const fillable = input.columns.filter(
      (column) => shared.has(column.id) && wanted.includes(column.id),
    );

    const lookup = new Map<string, Row>();
    for (const row of second.rows) {
      const key = keyOf(row, keyB);
      if (!lookup.has(key)) lookup.set(key, row);
    }

    const overwrite = booleanOption(options, 'overwrite', false);
    let filled = 0;
    const usedKeys = new Set<string>();

    const rows: Row[] = input.rows.map((row) => {
      const key = keyOf(row, keyA);
      usedKeys.add(key);
      const other = lookup.get(key);
      if (other === undefined) return row;

      const cells = { ...row.cells };
      for (const column of fillable) {
        const here = cell(row, column.id);
        const there = cell(other, column.id);
        // Nothing is ever replaced by nothing: an empty cell over there is not an answer.
        if (there.trim() === '' || there === here) continue;
        if (here.trim() !== '' && !overwrite) continue;
        cells[column.id] = there;
        filled += 1;
      }
      return { id: row.id, cells };
    });

    const missing = booleanOption(options, 'addMissing', false)
      ? second.rows.filter((row) => !usedKeys.has(keyOf(row, keyB)))
      : [];

    // Arriving rows get ids past the highest one here, so no id repeats — even after
    // removals have left gaps in the numbering.
    const nextId = rowIdsAfter(input);
    const all = [
      ...rows,
      ...missing.map((row) => ({
        id: nextId(),
        cells: Object.fromEntries(
          input.columns.map((column) => [
            column.id,
            shared.has(column.id) ? cell(row, column.id) : '',
          ]),
        ),
      })),
    ];

    if (filled === 0 && missing.length === 0) {
      return { output: input, summary: ui.tools.nothingChanged, warnings: [strings.nothing] };
    }

    return {
      output: withRows(input, all),
      summary: format(strings.summary, {
        cells: plural(filled, strings.filled),
        added: plural(missing.length, strings.added),
      }),
      stats: { filled, added: missing.length },
    };
  },
};
