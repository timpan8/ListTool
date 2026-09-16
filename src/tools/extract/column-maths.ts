import { cell, type Column, type Row } from '../../core/model';
import { formatNumber, parseNumber } from '../../core/number';
import { numberOption, stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { freeColumnId, rowsPhrase, targetColumn, withColumns } from '../helpers';

const strings = en.tools.columnMaths;

type How = 'rank' | 'denseRank' | 'runningTotal' | 'share' | 'difference';

const HOWS: How[] = ['rank', 'denseRank', 'runningTotal', 'share', 'difference'];

/** The result for every row, in row order; null where the row has no number. */
function compute(values: (number | null)[], how: How, largestFirst: boolean): (number | null)[] {
  if (how === 'rank' || how === 'denseRank') {
    const numbered = values
      .map((value, index) => ({ value, index }))
      .filter((entry): entry is { value: number; index: number } => entry.value !== null)
      .sort((a, b) => (largestFirst ? b.value - a.value : a.value - b.value));
    const ranks: (number | null)[] = values.map(() => null);
    let rank = 0;
    numbered.forEach((entry, position) => {
      const previous = numbered[position - 1];
      if (previous === undefined || previous.value !== entry.value) {
        rank = how === 'rank' ? position + 1 : rank + 1;
      }
      ranks[entry.index] = rank;
    });
    return ranks;
  }

  if (how === 'share') {
    const total = values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    return values.map((value) => (value === null || total === 0 ? null : (value / total) * 100));
  }

  let running = 0;
  let previous: number | null = null;
  return values.map((value) => {
    if (value === null) return null;
    if (how === 'runningTotal') {
      running += value;
      return running;
    }
    const difference = previous === null ? null : value - previous;
    previous = value;
    return difference;
  });
}

export const columnMathsTool: Tool = {
  id: 'column-maths',
  name: strings.name,
  category: 'extract',
  description: strings.description,
  keywords: ['rank', 'running', 'total', 'cumulative', 'share', 'percent', 'difference', 'maths'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column' },
    {
      key: 'how',
      label: strings.how,
      type: 'select',
      default: 'rank',
      choices: HOWS.map((how) => ({ value: how, label: strings.hows[how] })),
    },
    {
      key: 'direction',
      label: strings.direction,
      type: 'select',
      default: 'desc',
      choices: [
        { value: 'desc', label: strings.largest },
        { value: 'asc', label: strings.smallest },
      ],
    },
    { key: 'decimals', label: strings.decimals, type: 'number', default: 2 },
    { key: 'name', label: strings.columnName, type: 'text', default: '' },
  ],
  run(input, options) {
    const source = targetColumn(input, options);
    if (source === undefined) return { output: input, summary: en.tools.nothingChanged };

    const wanted = stringOption(options, 'how', 'rank');
    const how: How = HOWS.includes(wanted as How) ? (wanted as How) : 'rank';
    const largestFirst = stringOption(options, 'direction', 'desc') !== 'asc';
    const decimals = Math.max(0, Math.min(10, Math.trunc(numberOption(options, 'decimals', 2))));
    const typed = stringOption(options, 'name', '').trim();
    const target: Column = {
      id: freeColumnId(input, how.toLowerCase()),
      name: typed === '' ? strings.names[how] : typed,
    };

    const values = input.rows.map((row) => {
      const value = cell(row, source.id);
      return value.trim() === '' ? null : parseNumber(value);
    });
    const skipped = input.rows.filter(
      (row, index) => cell(row, source.id).trim() !== '' && values[index] === null,
    ).length;
    const results = compute(values, how, largestFirst);
    const whole = how === 'rank' || how === 'denseRank';

    const rows: Row[] = input.rows.map((row, index) => {
      const result = results[index] ?? null;
      const text =
        result === null
          ? ''
          : whole
            ? String(result)
            : formatNumber(result, { decimal: ',', thousands: ' ', decimals });
      return { id: row.id, cells: { ...row.cells, [target.id]: text } };
    });

    return {
      output: withColumns(input, [...input.columns, target], rows),
      summary: format(strings.summary, { name: target.name, rows: rowsPhrase(rows.length) }),
      stats: { rows: rows.length, skipped },
      ...(skipped > 0 ? { warnings: [plural(skipped, strings.skipped)] } : {}),
    };
  },
};
