import { cell } from '../../core/model';
import { joinKeys, normalizeKey } from '../../core/normalize';
import type { Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { rowsPhrase, withRows } from '../helpers';
import { KEY_FIELDS, NORMALIZE_FIELDS, readCompareOptions } from '../compare/shared';

const strings = en.tools.removeInB;

export const removeRowsInBTool: Tool = {
  id: 'remove-rows-in-b',
  name: strings.name,
  category: 'compare',
  description: strings.description,
  keywords: ['remove', 'exclude', 'subtract', 'minus', 'without', 'second', 'another'],
  arity: 'dual',
  options: [...KEY_FIELDS, ...NORMALIZE_FIELDS],
  run(input, options, second) {
    if (second === undefined) {
      return {
        output: input,
        summary: en.tools.nothingChanged,
        warnings: [en.tools.shared.secondListMissing],
      };
    }

    const { keyA, keyB, normalize } = readCompareOptions(options, input, second);
    const keyOf = (row: Parameters<typeof cell>[0], ids: string[]): string =>
      joinKeys(ids.map((id) => normalizeKey(cell(row, id), normalize)));

    const exclude = new Set(second.rows.map((row) => keyOf(row, keyB)));
    const kept = input.rows.filter((row) => !exclude.has(keyOf(row, keyA)));
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
