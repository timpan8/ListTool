import { cell, columnId, draftDataset, makeRow, type Column } from '../../core/model';
import { joinKeys, normalizeKey } from '../../core/normalize';
import { booleanOption, stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { targetColumn } from '../helpers';
import { parseNumber } from '../../core/number';

const strings = en.tools.crossTab;

/** How many columns a cross-tab may grow to before it stops being readable. */
const MAX_COLUMNS = 40;

const NORMALIZE = { trim: true, ignoreCase: true };

/** A number as people write it, or null. The same reading as Group and summarise. */
function short(value: number): string {
  return String(Number(value.toFixed(6)));
}

/** Distinct values of a column, in first-seen order, keeping the first spelling. */
function distinct(values: string[]): string[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    const key = normalizeKey(value, NORMALIZE);
    if (!seen.has(key)) seen.set(key, value.trim());
  }
  return [...seen.values()];
}

/** One cell of the grid, addressed by both keys at once. */
function at(down: string, across: string): string {
  return joinKeys([down, across]);
}

export const crossTabTool: Tool = {
  id: 'cross-tab',
  name: strings.name,
  category: 'extract',
  description: strings.description,
  keywords: ['cross', 'tab', 'pivot', 'matrix', 'by', 'two', 'grid', 'summary', 'breakdown'],
  arity: 'single',
  appliesTo: (input) => input.columns.length >= 2,
  options: [
    { key: 'column', label: strings.rows, type: 'column' },
    { key: 'by', label: strings.columns, type: 'column' },
    {
      key: 'how',
      label: strings.how,
      type: 'select',
      default: 'count',
      choices: [
        { value: 'count', label: strings.count },
        { value: 'sum', label: strings.sum },
      ],
    },
    { key: 'valueColumn', label: strings.valueColumn, type: 'column', allowNone: true, default: '' },
    { key: 'total', label: strings.total, type: 'boolean', default: true },
  ],
  run(input, options) {
    const down = targetColumn(input, options);
    const across = targetColumn(input, options, 'by') ?? down;
    if (down === undefined || across === undefined) {
      return { output: input, summary: en.tools.nothingChanged };
    }

    const summing = stringOption(options, 'how', 'count') === 'sum';
    const valueColumn = targetColumn(input, options, 'valueColumn') ?? down;
    const withTotal = booleanOption(options, 'total', true);

    const rowValues = distinct(input.rows.map((row) => cell(row, down.id)));
    const allAcross = distinct(input.rows.map((row) => cell(row, across.id)));
    const colValues = allAcross.slice(0, MAX_COLUMNS);
    const colKeys = new Set(colValues.map((value) => normalizeKey(value, NORMALIZE)));

    // Totalled by key, so two spellings of the same value land in the same cell.
    const totals = new Map<string, number>();
    let notNumeric = 0;

    for (const row of input.rows) {
      const acrossKey = normalizeKey(cell(row, across.id), NORMALIZE);
      if (!colKeys.has(acrossKey)) continue;
      const key = at(normalizeKey(cell(row, down.id), NORMALIZE), acrossKey);

      if (!summing) {
        totals.set(key, (totals.get(key) ?? 0) + 1);
        continue;
      }
      const value = cell(row, valueColumn.id);
      if (value.trim() === '') continue;
      const parsed = parseNumber(value);
      if (parsed === null) notNumeric += 1;
      else totals.set(key, (totals.get(key) ?? 0) + parsed);
    }

    const columns: Column[] = [
      { id: 'label', name: down.name },
      ...colValues.map((value, index) => ({
        id: columnId(index),
        name: value === '' ? en.profile.blankValue : value,
      })),
      ...(withTotal ? [{ id: 'total', name: strings.totalName }] : []),
    ];

    const rows = rowValues.map((value, index) => {
      const downKey = normalizeKey(value, NORMALIZE);
      const cells: Record<string, string> = {
        label: value === '' ? en.profile.blankValue : value,
      };
      let line = 0;

      colValues.forEach((acrossValue, position) => {
        const found = totals.get(at(downKey, normalizeKey(acrossValue, NORMALIZE))) ?? 0;
        line += found;
        // An empty cell reads better than a grid of zeroes.
        cells[columnId(position)] = found === 0 ? '' : short(found);
      });
      if (withTotal) cells['total'] = short(line);

      return makeRow(index, cells);
    });

    if (withTotal && rows.length > 0) {
      const cells: Record<string, string> = { label: strings.totalName };
      let grand = 0;
      colValues.forEach((acrossValue, position) => {
        const acrossKey = normalizeKey(acrossValue, NORMALIZE);
        const column = rowValues.reduce(
          (sum, value) => sum + (totals.get(at(normalizeKey(value, NORMALIZE), acrossKey)) ?? 0),
          0,
        );
        grand += column;
        cells[columnId(position)] = short(column);
      });
      cells['total'] = short(grand);
      rows.push(makeRow(rows.length, cells));
    }

    const warnings = [
      ...(allAcross.length > colValues.length
        ? [format(strings.tooWide, { n: allAcross.length, limit: MAX_COLUMNS })]
        : []),
      ...(notNumeric > 0 ? [format(strings.notNumeric, { n: notNumeric })] : []),
    ];

    return {
      output: { ...draftDataset({ columns, rows }), id: input.id, name: input.name },
      summary: format(strings.summary, {
        rows: plural(rowValues.length, strings.rowCount),
        columns: plural(colValues.length, strings.columnCount),
      }),
      stats: { rows: rowValues.length, columns: colValues.length, notNumeric },
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  },
};
