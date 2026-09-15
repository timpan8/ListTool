import { cell, type Row } from '../../core/model';
import { joinKeys, normalizeKey } from '../../core/normalize';
import { booleanOption, stringsOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { rowIdsAfter, withRows } from '../helpers';

const strings = en.tools.coalesce;

export const coalesceTool: Tool = {
  id: 'coalesce',
  name: strings.name,
  category: 'compare',
  description: strings.description,
  keywords: ['coalesce', 'fill', 'merge', 'gaps', 'missing', 'combine', 'enrich', 'truth'],
  arity: 'dual',
  options: [
    { key: 'keyA', label: en.compare.listA, type: 'columns' },
    { key: 'keyB', label: en.compare.listB, type: 'columns', from: 'second' },
    { key: 'columns', label: strings.columns, type: 'columns' },
    { key: 'overwrite', label: strings.overwrite, type: 'boolean', default: false },
    { key: 'addMissing', label: strings.addMissing, type: 'boolean', default: false },
    { key: 'trim', label: en.tools.shared.trim, type: 'boolean', default: true },
    { key: 'ignoreCase', label: en.tools.shared.ignoreCase, type: 'boolean', default: true },
    {
      key: 'ignoreDiacritics',
      label: en.tools.shared.ignoreDiacritics,
      type: 'boolean',
      default: false,
      help: en.tools.shared.diacriticsHelp,
    },
  ],
  run(input, options, second) {
    if (second === undefined) {
      return {
        output: input,
        summary: en.tools.nothingChanged,
        warnings: [en.tools.shared.secondListMissing],
      };
    }

    const keyA = stringsOption(options, 'keyA', [input.columns[0]?.id ?? '']);
    const keyB = stringsOption(options, 'keyB', [second.columns[0]?.id ?? '']);
    const normalize = {
      trim: booleanOption(options, 'trim', true),
      ignoreCase: booleanOption(options, 'ignoreCase', true),
      ignoreDiacritics: booleanOption(options, 'ignoreDiacritics', false),
    };
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
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.nothing] };
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
