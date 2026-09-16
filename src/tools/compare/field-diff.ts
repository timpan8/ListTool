import { cell, makeRow, type Row } from '../../core/model';
import { joinKeys, normalizeKey } from '../../core/normalize';
import { booleanOption, stringsOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format, plural } from '../../i18n/format';
import { freshDataset } from '../helpers';
import { KEY_FIELDS, NORMALIZE_FIELDS, readCompareOptions } from './shared';

const strings = ui.tools.fieldDiff;

export const fieldDiffTool: Tool = {
  id: 'field-diff',
  name: strings.name,
  category: 'compare',
  description: strings.description,
  keywords: ['diff', 'changed', 'difference', 'fields', 'updated', 'compare', 'what'],
  arity: 'dual',
  options: [
    ...KEY_FIELDS,
    { key: 'compare', label: strings.compare, type: 'columns' },
    { key: 'onlyFilled', label: strings.onlyFilled, type: 'boolean', default: false },
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
      return { output: input, summary: ui.tools.nothingChanged, warnings: [strings.noColumns] };
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
      ...(unmatched > 0 ? [plural(unmatched, strings.unmatched)] : []),
    ];

    return {
      output: freshDataset(
        input,
        [
          { id: 'key', name: strings.keyColumn },
          { id: 'field', name: strings.fieldColumn },
          { id: 'a', name: input.name },
          { id: 'b', name: second.name },
        ],
        rows,
      ),
      summary: format(strings.summary, {
        changes: plural(rows.length, strings.changes),
        rows: plural(matched, strings.matched),
      }),
      stats: { changes: rows.length, matched, unmatched },
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  },
};
