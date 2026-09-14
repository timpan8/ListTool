import { cell } from '../../core/model';
import { normalizeKey } from '../../core/normalize';
import { booleanOption, stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { rowsPhrase, withRows } from '../helpers';

const strings = en.tools.removeInB;

export const removeRowsInBTool: Tool = {
  id: 'remove-rows-in-b',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['remove', 'exclude', 'subtract', 'minus', 'without', 'second'],
  arity: 'dual',
  options: [
    { key: 'keyA', label: en.compare.listA, type: 'column' },
    { key: 'keyB', label: en.compare.listB, type: 'column' },
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

    const normalize = {
      trim: booleanOption(options, 'trim', true),
      ignoreCase: booleanOption(options, 'ignoreCase', true),
      ignoreDiacritics: booleanOption(options, 'ignoreDiacritics', false),
    };
    const keyA = stringOption(options, 'keyA', input.columns[0]?.id ?? '');
    const keyB = stringOption(options, 'keyB', second.columns[0]?.id ?? '');

    const exclude = new Set(
      second.rows.map((row) => normalizeKey(cell(row, keyB), normalize)),
    );
    const kept = input.rows.filter(
      (row) => !exclude.has(normalizeKey(cell(row, keyA), normalize)),
    );
    const removed = input.rows.length - kept.length;

    return {
      output: withRows(input, kept),
      summary:
        removed === 0
          ? en.tools.nothingChanged
          : format(strings.summary, {
              removed: plural(removed, strings.removed),
              before: rowsPhrase(input.rows.length),
              after: rowsPhrase(kept.length),
            }),
      stats: { removed },
    };
  },
};
