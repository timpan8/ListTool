import { cell, type Column, type Row } from '../../core/model';
import { joinKeys, normalizeKey } from '../../core/normalize';
import { booleanOption, stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { rowsPhrase, targetColumns, withRows } from '../helpers';

const strings = en.tools.dedupe;

type Keep = 'first' | 'last' | 'fullest' | 'largest' | 'smallest';

/** How many cells of a row actually hold something. */
function filledCells(row: Row, columns: Column[]): number {
  return columns.filter((column) => cell(row, column.id).trim() !== '').length;
}

/** Compare two values as numbers when both are, and as text otherwise. */
function compare(a: string, b: string): number {
  const left = Number(a.replace(/\s/g, '').replace(',', '.'));
  const right = Number(b.replace(/\s/g, '').replace(',', '.'));
  if (a.trim() !== '' && b.trim() !== '' && Number.isFinite(left) && Number.isFinite(right)) {
    return left - right;
  }
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
  run(input, options) {
    const columns = targetColumns(input, options);
    const normalize = {
      trim: booleanOption(options, 'trim', true),
      ignoreCase: booleanOption(options, 'ignoreCase', true),
      ignoreDiacritics: booleanOption(options, 'ignoreDiacritics', false),
    };
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
};
