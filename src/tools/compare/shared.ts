import type { CompareLabels, CompareOptions, CompareRow } from '../../core/compare';
import type { Dataset } from '../../core/model';
import type { NormalizeOptions } from '../../core/normalize';
import { booleanOption, stringsOption, type OptionField, type Options } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';

/**
 * What every dual tool asks first: which columns to match on, on each list. The default
 * names the email column, which is what a recipient list matches on; a list without one
 * falls back to its first column, in the form and in the run alike.
 */
export const KEY_FIELDS: OptionField[] = [
  { key: 'keyA', label: en.tools.shared.matchOn, type: 'columns', default: ['email'] },
  {
    key: 'keyB',
    label: en.tools.shared.matchOn,
    type: 'columns',
    from: 'second',
    default: ['email'],
  },
];

/** How values are matched — the same four switches, in the same order, in every dual tool. */
export const NORMALIZE_FIELDS: OptionField[] = [
  { key: 'trim', label: en.tools.shared.trim, type: 'boolean', default: true },
  { key: 'ignoreCase', label: en.tools.shared.ignoreCase, type: 'boolean', default: true },
  {
    key: 'collapseWhitespace',
    label: en.tools.shared.collapseWhitespace,
    type: 'boolean',
    default: false,
  },
  {
    key: 'ignoreDiacritics',
    label: en.tools.shared.ignoreDiacritics,
    type: 'boolean',
    default: false,
    help: en.tools.shared.diacriticsHelp,
  },
];

export function readNormalize(options: Options): NormalizeOptions {
  return {
    trim: booleanOption(options, 'trim', true),
    ignoreCase: booleanOption(options, 'ignoreCase', true),
    collapseWhitespace: booleanOption(options, 'collapseWhitespace', false),
    ignoreDiacritics: booleanOption(options, 'ignoreDiacritics', false),
  };
}

/** The key columns that exist, or the first column. A lone string is read as one column. */
function keyColumns(options: Options, key: string, dataset: Dataset): string[] {
  const raw = options[key];
  const wanted = typeof raw === 'string' ? [raw] : stringsOption(options, key, []);
  const existing = wanted.filter((id) => dataset.columns.some((column) => column.id === id));
  return existing.length > 0 ? existing : [dataset.columns[0]?.id ?? ''];
}

/** The keys and the matching rules a dual tool runs with, read the same way everywhere. */
export function readCompareOptions(options: Options, a: Dataset, b: Dataset): CompareOptions {
  return {
    keyA: keyColumns(options, 'keyA', a),
    keyB: keyColumns(options, 'keyB', b),
    normalize: readNormalize(options),
  };
}

/** The words the side-by-side table uses, with the lists called by their names. */
export function compareLabels(a: Dataset, b: Dataset): CompareLabels {
  const names = { a: a.name, b: b.name };
  return {
    status: en.compare.statusColumn,
    countA: format(en.compare.countIn, { list: a.name }),
    countB: format(en.compare.countIn, { list: b.name }),
    missing: en.compare.missing,
    statusText: (row: CompareRow) =>
      format(en.compare.statuses[row.status], {
        ...names,
        countA: row.countA,
        countB: row.countB,
      }),
  };
}
