import { compareDatasets, sideBySide } from '../../core/compare';
import type { Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format } from '../../i18n/format';
import { rowsPhrase } from '../helpers';
import { compareLabels, KEY_FIELDS, NORMALIZE_FIELDS, readCompareOptions } from './shared';

const strings = ui.tools.compareLists;

/**
 * The comparison as a table: one row per key, the status first, then every column of
 * each list side by side, the lists called by their names. Compare mode is this tool's
 * form and this tool's result; they cannot drift apart.
 */
export const compareListsTool: Tool = {
  id: 'compare-lists',
  name: strings.name,
  category: 'compare',
  description: strings.description,
  keywords: ['compare', 'diff', 'match', 'against', 'two', 'both', 'side by side'],
  arity: 'dual',
  options: [...KEY_FIELDS, ...NORMALIZE_FIELDS],
  run(input, options, second) {
    if (second === undefined) {
      return {
        output: input,
        summary: ui.tools.nothingChanged,
        warnings: [ui.tools.shared.secondListMissing],
      };
    }

    const compare = readCompareOptions(options, input, second);
    const result = compareDatasets(input, second, compare);
    const side = sideBySide(result, input, second, compareLabels(input, second), compare.normalize);
    const differences =
      result.stats['count-differs'] + result.stats['only-a'] + result.stats['only-b'];

    return {
      output: side.dataset,
      summary: format(strings.summary, {
        rows: rowsPhrase(result.rows.length),
        matches: result.stats.match,
        differences,
      }),
      stats: { ...result.stats, differing: side.changedCells.size / 2 },
    };
  },
};
