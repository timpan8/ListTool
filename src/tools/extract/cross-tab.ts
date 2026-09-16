import { cell, columnId, makeRow, type Column } from '../../core/model';
import { normalizeKey, type NormalizeOptions } from '../../core/normalize';
import { booleanOption, stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { freshDataset, NORMALIZE_FIELDS, readNormalize, targetColumn } from '../helpers';
import { parseNumber } from '../../core/number';

const strings = en.tools.crossTab;

/** How many columns a cross-tab may grow to before it stops being readable. */
const MAX_COLUMNS = 40;

/** How many rows down the side before it is a list again, not a summary of one. */
const MAX_ROWS = 500;

/** A number as people write it, or null. The same reading as Group and summarise. */
function short(value: number): string {
  return String(Number(value.toFixed(6)));
}

/** The distinct values of a column in first-seen order, by key, keeping the first spelling. */
interface Axis {
  keys: string[];
  labels: Map<string, string>;
  /** How many distinct values there were before the cap. */
  total: number;
}

function axis(values: string[], normalize: NormalizeOptions, limit: number): Axis {
  const labels = new Map<string, string>();
  const keys: string[] = [];
  let total = 0;
  for (const value of values) {
    const key = normalizeKey(value, normalize);
    if (labels.has(key)) continue;
    total += 1;
    if (keys.length === limit) continue;
    keys.push(key);
    labels.set(key, value.trim());
  }
  return { keys, labels, total };
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
    ...NORMALIZE_FIELDS,
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
    const normalize = readNormalize(options);

    // Every key is built once per row, and the grid is one map of maps: a row of the
    // list touches exactly one cell of it.
    const downKeys = input.rows.map((row) => normalizeKey(cell(row, down.id), normalize));
    const acrossKeys = input.rows.map((row) => normalizeKey(cell(row, across.id), normalize));
    const rowAxis = axis(input.rows.map((row) => cell(row, down.id)), normalize, MAX_ROWS);
    const colAxis = axis(input.rows.map((row) => cell(row, across.id)), normalize, MAX_COLUMNS);
    const inRows = new Set(rowAxis.keys);
    const inCols = new Set(colAxis.keys);

    const grid = new Map<string, Map<string, number>>();
    let notNumeric = 0;

    input.rows.forEach((row, index) => {
      const downKey = downKeys[index] ?? '';
      const acrossKey = acrossKeys[index] ?? '';
      if (!inRows.has(downKey) || !inCols.has(acrossKey)) return;

      let amount = 1;
      if (summing) {
        const value = cell(row, valueColumn.id);
        if (value.trim() === '') return;
        const parsed = parseNumber(value);
        if (parsed === null) {
          notNumeric += 1;
          return;
        }
        amount = parsed;
      }

      const line = grid.get(downKey) ?? new Map<string, number>();
      line.set(acrossKey, (line.get(acrossKey) ?? 0) + amount);
      grid.set(downKey, line);
    });

    const label = (value: string): string => (value === '' ? en.profile.blankValue : value);
    const columns: Column[] = [
      { id: 'label', name: down.name },
      ...colAxis.keys.map((key, index) => ({
        id: columnId(index),
        name: label(colAxis.labels.get(key) ?? ''),
      })),
      ...(withTotal ? [{ id: 'total', name: strings.totalName }] : []),
    ];

    const columnTotals = new Map<string, number>();
    const rows = rowAxis.keys.map((downKey, index) => {
      const line = grid.get(downKey);
      const cells: Record<string, string> = { label: label(rowAxis.labels.get(downKey) ?? '') };
      let lineTotal = 0;

      colAxis.keys.forEach((acrossKey, position) => {
        const found = line?.get(acrossKey) ?? 0;
        lineTotal += found;
        columnTotals.set(acrossKey, (columnTotals.get(acrossKey) ?? 0) + found);
        // An empty cell reads better than a grid of zeroes.
        cells[columnId(position)] = found === 0 ? '' : short(found);
      });
      if (withTotal) cells['total'] = short(lineTotal);

      return makeRow(index, cells);
    });

    if (withTotal && rows.length > 0) {
      const cells: Record<string, string> = { label: strings.totalName };
      let grand = 0;
      colAxis.keys.forEach((acrossKey, position) => {
        const column = columnTotals.get(acrossKey) ?? 0;
        grand += column;
        cells[columnId(position)] = short(column);
      });
      cells['total'] = short(grand);
      rows.push(makeRow(rows.length, cells));
    }

    const warnings = [
      ...(rowAxis.total > rowAxis.keys.length
        ? [format(strings.tooTall, { n: rowAxis.total, limit: MAX_ROWS })]
        : []),
      ...(colAxis.total > colAxis.keys.length
        ? [format(strings.tooWide, { n: colAxis.total, limit: MAX_COLUMNS })]
        : []),
      ...(notNumeric > 0 ? [plural(notNumeric, strings.notNumeric)] : []),
    ];

    return {
      output: freshDataset(input, columns, rows),
      summary: format(strings.summary, {
        rows: plural(rowAxis.keys.length, strings.rowCount),
        columns: plural(colAxis.keys.length, strings.columnCount),
      }),
      stats: { rows: rowAxis.keys.length, columns: colAxis.keys.length, notNumeric },
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  },
};
