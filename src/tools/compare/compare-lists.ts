import { compareDatasets, toAlignedDataset } from '../../core/compare';
import { booleanOption, stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { rowsPhrase } from '../helpers';

const strings = en.tools.compareLists;

/** Labels for the aligned table, kept here so core/compare stays free of i18n. */
export const ALIGNED_LABELS = {
  a: en.compare.columnA,
  b: en.compare.columnB,
  status: en.compare.statusColumn,
  countA: en.compare.countA,
  countB: en.compare.countB,
  missing: en.compare.missing,
  statuses: en.compare.statuses,
};

export const compareListsTool: Tool = {
  id: 'compare-lists',
  name: strings.name,
  category: 'compare',
  description: strings.description,
  keywords: ['compare', 'diff', 'match', 'against', 'two', 'both'],
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

    const result = compareDatasets(input, second, {
      keyA: stringOption(options, 'keyA', input.columns[0]?.id ?? ''),
      keyB: stringOption(options, 'keyB', second.columns[0]?.id ?? ''),
      normalize: {
        trim: booleanOption(options, 'trim', true),
        ignoreCase: booleanOption(options, 'ignoreCase', true),
        ignoreDiacritics: booleanOption(options, 'ignoreDiacritics', false),
      },
    });

    const differences =
      result.stats['count-differs'] + result.stats['only-a'] + result.stats['only-b'];

    return {
      output: toAlignedDataset(result.rows, ALIGNED_LABELS),
      summary: format(strings.summary, {
        rows: rowsPhrase(result.rows.length),
        matches: result.stats.match,
        differences,
      }),
      stats: { ...result.stats },
    };
  },
};
