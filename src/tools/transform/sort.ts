import { cell, type Column, type Row } from '../../core/model';
import { booleanOption, stringOption, type Tool } from '../../core/registry';
import { compareValues, DEFAULT_LOCALE, type SortOptions } from '../../core/sort';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { rowsPhrase, withRows } from '../helpers';

const strings = en.tools.sort;

const DIRECTIONS = [
  { value: 'asc', label: strings.ascending },
  { value: 'desc', label: strings.descending },
];

interface Level {
  column: Column;
  descending: boolean;
}

/** The keys to sort on, in order. A level with no column chosen simply is not there. */
function levels(input: Parameters<Tool['run']>[0], options: Record<string, unknown>): Level[] {
  const wanted: [string, string][] = [
    ['column', 'direction'],
    ['then', 'thenDirection'],
    ['then2', 'then2Direction'],
  ];

  const found: Level[] = [];
  for (const [columnKey, directionKey] of wanted) {
    const id = stringOption(options, columnKey, '');
    // The first level falls back to the first column, so a plain list needs no choice.
    const column =
      id === ''
        ? columnKey === 'column'
          ? input.columns[0]
          : undefined
        : input.columns.find((candidate) => candidate.id === id);
    if (column === undefined) continue;
    // Naming the same column twice would only ever be a slip.
    if (found.some((level) => level.column.id === column.id)) continue;
    found.push({ column, descending: stringOption(options, directionKey, 'asc') === 'desc' });
  }
  return found;
}

export const sortTool: Tool = {
  id: 'sort',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['sort', 'order', 'alphabetical', 'az', 'za', 'length', 'then', 'secondary'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column' },
    { key: 'direction', label: strings.direction, type: 'select', default: 'asc', choices: DIRECTIONS },
    { key: 'then', label: strings.then, type: 'column', allowNone: true, default: '' },
    {
      key: 'thenDirection',
      label: strings.thenDirection,
      type: 'select',
      default: 'asc',
      choices: DIRECTIONS,
    },
    { key: 'then2', label: strings.then2, type: 'column', allowNone: true, default: '' },
    {
      key: 'then2Direction',
      label: strings.then2Direction,
      type: 'select',
      default: 'asc',
      choices: DIRECTIONS,
    },
    {
      key: 'by',
      label: strings.by,
      type: 'select',
      default: 'value',
      choices: [
        { value: 'value', label: strings.byValue },
        { value: 'length', label: strings.byLength },
      ],
    },
    {
      key: 'locale',
      label: strings.locale,
      type: 'select',
      default: DEFAULT_LOCALE,
      choices: [
        { value: 'sv', label: strings.localeSv },
        { value: 'en', label: strings.localeEn },
      ],
    },
    { key: 'numeric', label: strings.numeric, type: 'boolean', default: true },
  ],
  run(input, options) {
    const keys = levels(input, options);
    if (keys.length === 0) {
      return { output: input, summary: en.tools.nothingChanged };
    }

    const byLength = stringOption(options, 'by', 'value') === 'length';
    const base: SortOptions = {
      locale: stringOption(options, 'locale', DEFAULT_LOCALE),
      numeric: booleanOption(options, 'numeric', true),
    };

    const valueOf = (row: Row, column: Column): string => cell(row, column.id);

    // One pass over every level: the second key only ever decides a tie on the first.
    // The original position breaks a full tie, so the order never wobbles between runs.
    const rows = input.rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        for (const level of keys) {
          const left = valueOf(a.row, level.column);
          const right = valueOf(b.row, level.column);
          const verdict = byLength
            ? [...left].length - [...right].length || compareValues(left, right, base)
            : compareValues(left, right, base);
          if (verdict !== 0) return level.descending ? -verdict : verdict;
        }
        return a.index - b.index;
      })
      .map((entry) => entry.row);

    const first = keys[0] as Level;

    return {
      output: withRows(input, rows),
      summary:
        keys.length === 1
          ? format(strings.summary, {
              rows: rowsPhrase(rows.length),
              column: first.column.name,
              direction: first.descending ? strings.descending : strings.ascending,
            })
          : format(strings.summaryLevels, {
              rows: rowsPhrase(rows.length),
              keys: keys
                .map(
                  (level) =>
                    `${level.column.name} (${level.descending ? strings.descending : strings.ascending})`,
                )
                .join(strings.keySeparator),
            }),
      stats: { rows: rows.length, keys: keys.length },
    };
  },
};
