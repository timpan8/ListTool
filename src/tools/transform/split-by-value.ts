import { cell, type Row } from '../../core/model';
import { normalizeKey } from '../../core/normalize';
import { stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import {
  MAX_LISTS,
  NORMALIZE_FIELDS,
  readNormalize,
  rowsPhrase,
  targetColumn,
  withRows,
} from '../helpers';

const strings = en.tools.splitByValue;

const DEFAULT_PATTERN = '{value}';

export const splitByValueTool: Tool = {
  id: 'split-by-value',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['split', 'by', 'group', 'separate', 'per', 'lists', 'tabs', 'department'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column' },
    {
      key: 'pattern',
      label: strings.pattern,
      type: 'text',
      default: DEFAULT_PATTERN,
      help: strings.nameHelp,
    },
    ...NORMALIZE_FIELDS,
  ],
  run(input, options) {
    const column = targetColumn(input, options);
    if (column === undefined) return { output: input, summary: en.tools.nothingChanged };

    const normalize = readNormalize(options);

    // Grouped in first-seen order, and named by the first spelling seen.
    const groups = new Map<string, { value: string; rows: Row[] }>();
    for (const row of input.rows) {
      const value = cell(row, column.id).trim();
      const key = normalizeKey(cell(row, column.id), normalize);
      const existing = groups.get(key);
      if (existing === undefined) groups.set(key, { value, rows: [row] });
      else existing.rows.push(row);
    }

    if (groups.size < 2) {
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.onlyOne] };
    }
    if (groups.size > MAX_LISTS) {
      return {
        output: input,
        summary: en.tools.nothingChanged,
        warnings: [format(strings.tooMany, { n: groups.size, limit: MAX_LISTS })],
      };
    }

    const pattern = stringOption(options, 'pattern', DEFAULT_PATTERN);
    const nameOf = (value: string): string =>
      format(pattern, { name: input.name, value: value === '' ? strings.blankValue : value });

    // A group is the same rows in the same shape, so they keep their ids.
    const asDataset = (rows: Row[]) => withRows(input, rows);

    // The first group replaces the list in place; the rest open as further tabs, so the
    // whole split is one undoable action.
    const [first, ...rest] = [...groups.values()];

    return {
      output: asDataset(first?.rows ?? []),
      summary: format(strings.summary, {
        rows: rowsPhrase(input.rows.length),
        lists: plural(groups.size, strings.lists),
      }),
      stats: { lists: groups.size },
      extraLists: rest.map((group) => ({
        name: nameOf(group.value),
        dataset: asDataset(group.rows),
      })),
    };
  },
};
