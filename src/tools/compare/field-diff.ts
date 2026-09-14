import { cell, draftDataset, makeRow, type Row } from '../../core/model';
import { joinKeys, normalizeKey } from '../../core/normalize';
import { booleanOption, stringsOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';

const strings = en.tools.fieldDiff;

export const fieldDiffTool: Tool = {
  id: 'field-diff',
  name: strings.name,
  category: 'compare',
  description: strings.description,
  keywords: ['diff', 'changed', 'difference', 'fields', 'updated', 'compare', 'what'],
  arity: 'dual',
  options: [
    { key: 'keyA', label: en.compare.listA, type: 'columns' },
    { key: 'keyB', label: en.compare.listB, type: 'columns', from: 'second' },
    { key: 'compare', label: strings.compare, type: 'columns' },
    { key: 'onlyFilled', label: strings.onlyFilled, type: 'boolean', default: false },
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

    // Only columns both lists have can differ; the rest are a shape difference, which
    // Compare lists and Join lists already answer.
    const shared = new Set(second.columns.map((column) => column.id));
    const wanted = stringsOption(
      options,
      'compare',
      input.columns.filter((column) => shared.has(column.id)).map((column) => column.id),
    );
    const compared = input.columns.filter(
      (column) => shared.has(column.id) && wanted.includes(column.id) && !keyA.includes(column.id),
    );

    if (compared.length === 0) {
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.noColumns] };
    }

    const lookup = new Map<string, Row>();
    for (const row of second.rows) {
      const key = keyOf(row, keyB);
      // The first match wins, the same way Join lists takes the first.
      if (!lookup.has(key)) lookup.set(key, row);
    }

    const onlyFilled = booleanOption(options, 'onlyFilled', false);
    const rows: Row[] = [];
    let matched = 0;

    for (const row of input.rows) {
      const other = lookup.get(keyOf(row, keyA));
      if (other === undefined) continue;
      matched += 1;

      for (const column of compared) {
        const a = cell(row, column.id);
        const b = cell(other, column.id);
        if (normalizeKey(a, normalize) === normalizeKey(b, normalize)) continue;
        if (onlyFilled && (a.trim() === '' || b.trim() === '')) continue;

        rows.push(
          makeRow(rows.length, {
            key: keyA.map((id) => cell(row, id)).join(' '),
            field: column.name,
            a,
            b,
          }),
        );
      }
    }

    const unmatched = input.rows.length - matched;
    const warnings = [
      ...(rows.length === 0 ? [strings.none] : []),
      ...(unmatched > 0 ? [format(strings.unmatched, { n: unmatched })] : []),
    ];

    return {
      output: {
        ...draftDataset({
          columns: [
            { id: 'key', name: strings.keyColumn },
            { id: 'field', name: strings.fieldColumn },
            { id: 'a', name: strings.valueA },
            { id: 'b', name: strings.valueB },
          ],
          rows,
        }),
        id: input.id,
        name: input.name,
      },
      summary: format(strings.summary, {
        changes: plural(rows.length, strings.changes),
        rows: plural(matched, strings.matched),
      }),
      stats: { changes: rows.length, matched, unmatched },
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  },
};
