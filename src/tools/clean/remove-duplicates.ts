import { cell, type Column, type Row } from '../../core/model';
import { joinKeys, normalizeKey } from '../../core/normalize';
import { stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { NORMALIZE_FIELDS, readNormalize, rowsPhrase, targetColumns, withRows } from '../helpers';
import { parseNumber } from '../../core/number';

const strings = en.tools.dedupe;

type Keep = 'first' | 'last' | 'fullest' | 'largest' | 'smallest';

/** How many cells of a row actually hold something. */
function filledCells(row: Row, columns: Column[]): number {
  return columns.filter((column) => cell(row, column.id).trim() !== '').length;
}

/** Compare two values as numbers when both are, and as text otherwise. */
function compare(a: string, b: string): number {
  const left = parseNumber(a);
  const right = parseNumber(b);
  if (left !== null && right !== null) return left - right;
  return a.localeCompare(b);
}

/** Which row of a set of duplicates survives. */
function winner(rows: Row[], keep: Keep, columns: Column[], decider: Column | undefined): Row {
  if (keep === 'first') return rows[0] as Row;
  if (keep === 'last') return rows[rows.length - 1] as Row;

  return rows.reduce((best, row) => {
    if (keep === 'fullest') {
      return filledCells(row, columns) > filledCells(best, columns) ? row : best;
    }
    if (decider === undefined) return best;
    const verdict = compare(cell(row, decider.id), cell(best, decider.id));
    // A tie keeps the earlier row, so the result never depends on how it was read.
    return keep === 'largest' ? (verdict > 0 ? row : best) : verdict < 0 ? row : best;
  }, rows[0] as Row);
}

export const removeDuplicatesTool: Tool = {
  id: 'remove-duplicates',
  name: strings.name,
  category: 'clean',
  description: strings.description,
  keywords: ['duplicate', 'dedupe', 'unique', 'distinct', 'repeat', 'newest', 'best'],
  arity: 'single',
  options: [
    {
      key: 'column',
      label: en.tools.shared.keyColumn,
      type: 'column',
      default: '',
      allowAll: true,
    },
    {
      key: 'keep',
      label: strings.keep,
      type: 'select',
      default: 'first',
      choices: [
        { value: 'first', label: strings.keepFirst },
        { value: 'last', label: strings.keepLast },
        { value: 'fullest', label: strings.keepFullest },
        { value: 'largest', label: strings.keepLargest },
        { value: 'smallest', label: strings.keepSmallest },
      ],
    },
    {
      key: 'keepColumn',
      label: strings.keepColumn,
      type: 'column',
      allowNone: true,
      default: '',
      help: strings.keepColumnHelp,
    },
    ...NORMALIZE_FIELDS,
  ],
  run(input, options) {
    const columns = targetColumns(input, options);
    const normalize = readNormalize(options);
    const keep = stringOption(options, 'keep', 'first') as Keep;
    const deciderId = stringOption(options, 'keepColumn', '');
    const decider =
      input.columns.find((column) => column.id === deciderId) ?? input.columns[0];

    // Grouped in first-seen order: whichever row wins, the list keeps its shape.
    const groups = new Map<string, Row[]>();
    for (const row of input.rows) {
      const key = joinKeys(
        columns.map((column) => normalizeKey(cell(row, column.id), normalize)),
      );
      const existing = groups.get(key);
      if (existing === undefined) groups.set(key, [row]);
      else existing.push(row);
    }

    const kept = [...groups.values()].map((rows) =>
      rows.length === 1 ? (rows[0] as Row) : winner(rows, keep, input.columns, decider),
    );
    const removed = input.rows.length - kept.length;

    return {
      output: withRows(input, kept),
      summary:
        removed === 0
          ? en.tools.nothingChanged
          : format(strings.summary, {
              removed: plural(removed, strings.duplicates),
              before: rowsPhrase(input.rows.length),
              after: rowsPhrase(kept.length),
            }),
      stats: { removed, kept: kept.length },
    };
  },
  check(input) {
    const seen = new Set<string>();
    let duplicates = 0;
    for (const row of input.rows) {
      const key = joinKeys(
        input.columns.map((column) =>
          normalizeKey(cell(row, column.id), { trim: true, ignoreCase: true }),
        ),
      );
      if (seen.has(key)) duplicates += 1;
      else seen.add(key);
    }
    if (duplicates === 0) return null;
    return {
      summary: format(strings.found, { n: duplicates }),
      count: duplicates,
      options: { column: '', keep: 'first' },
    };
  },
};
