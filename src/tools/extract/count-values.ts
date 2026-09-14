import { cell, draftDataset, makeRow } from '../../core/model';
import { booleanOption, type Tool } from '../../core/registry';
import { normalizeKey } from '../../core/normalize';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { rowsPhrase, targetColumn } from '../helpers';

const strings = en.tools.countValues;

export const countValuesTool: Tool = {
  id: 'count-values',
  name: strings.name,
  category: 'extract',
  description: strings.description,
  keywords: ['count', 'frequency', 'tally', 'how many', 'group'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column' },
    { key: 'trim', label: en.tools.shared.trim, type: 'boolean', default: true },
    { key: 'ignoreCase', label: en.tools.shared.ignoreCase, type: 'boolean', default: true },
  ],
  run(input, options) {
    const source = targetColumn(input, options);
    if (source === undefined) return { output: input, summary: en.tools.nothingChanged };

    const normalize = {
      trim: booleanOption(options, 'trim', true),
      ignoreCase: booleanOption(options, 'ignoreCase', true),
    };

    // The first spelling seen is the one shown — normalization only groups.
    const groups = new Map<string, { value: string; count: number }>();
    for (const row of input.rows) {
      const value = cell(row, source.id);
      const key = normalizeKey(value, normalize);
      const existing = groups.get(key);
      if (existing === undefined) groups.set(key, { value, count: 1 });
      else existing.count += 1;
    }

    const sorted = [...groups.values()].sort((a, b) => b.count - a.count);
    const output = draftDataset({
      columns: [
        { id: 'value', name: strings.valueColumn },
        { id: 'count', name: strings.countColumn },
      ],
      rows: sorted.map((entry, index) =>
        makeRow(index, { value: entry.value, count: String(entry.count) }),
      ),
    });

    return {
      output,
      summary: format(strings.summary, {
        values: plural(sorted.length, strings.values),
        rows: rowsPhrase(input.rows.length),
      }),
      stats: { distinct: sorted.length },
    };
  },
};
