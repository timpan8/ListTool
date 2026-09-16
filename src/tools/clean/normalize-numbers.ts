import { cell } from '../../core/model';
import { formatNumber, parseNumber, type NumberShape } from '../../core/number';
import { stringOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format, plural } from '../../i18n/format';
import { cellsPhrase, mapCells, targetColumns, withRows } from '../helpers';

const strings = ui.tools.normalizeNumbers;

function shapeOf(options: Record<string, unknown>): NumberShape {
  const thousands = stringOption(options, 'thousands', ' ');
  const decimals = stringOption(options, 'decimals', 'keep');
  return {
    decimal: stringOption(options, 'decimal', ',') === '.' ? '.' : ',',
    thousands: thousands === ' ' || thousands === ',' || thousands === '.' ? thousands : '',
    ...(decimals === 'keep' ? {} : { decimals: Number(decimals) }),
  };
}

/** Which mark a written number uses for its decimals, when it visibly uses one. */
function decimalMarkOf(value: string): ',' | '.' | null {
  const compact = value.trim().replace(/[\s ]/g, '');
  const commas = compact.split(',').length - 1;
  const points = compact.split('.').length - 1;
  if (commas === 1 && points === 0 && !/,\d{3}$/.test(compact)) return ',';
  if (points === 1 && commas === 0 && !/\.\d{3}$/.test(compact)) return '.';
  if (commas > 0 && points > 0) return compact.lastIndexOf(',') > compact.lastIndexOf('.') ? ',' : '.';
  return null;
}

export const normalizeNumbersTool: Tool = {
  id: 'normalize-numbers',
  name: strings.name,
  category: 'clean',
  description: strings.description,
  keywords: ['number', 'numbers', 'decimal', 'comma', 'thousands', 'format', 'normalise', 'amount'],
  arity: 'single',
  options: [
    { key: 'column', label: ui.tools.shared.column, type: 'column', default: '', allowAll: true },
    {
      key: 'decimal',
      label: strings.decimal,
      type: 'select',
      default: ',',
      choices: [
        { value: ',', label: strings.decimalComma },
        { value: '.', label: strings.decimalPoint },
      ],
    },
    {
      key: 'thousands',
      label: strings.thousands,
      type: 'select',
      default: ' ',
      choices: [
        { value: 'none', label: strings.thousandsNone },
        { value: ' ', label: strings.thousandsSpace },
        { value: ',', label: strings.thousandsComma },
        { value: '.', label: strings.thousandsPoint },
      ],
    },
    {
      key: 'decimals',
      label: strings.decimals,
      type: 'select',
      default: 'keep',
      choices: [
        { value: 'keep', label: strings.decimalsKeep },
        { value: '0', label: '0' },
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
      ],
    },
  ],
  run(input, options) {
    const shape = shapeOf(options);
    let left = 0;

    const { rows, changed } = mapCells(input, targetColumns(input, options), (value) => {
      if (value.trim() === '') return value;
      const parsed = parseNumber(value);
      if (parsed === null) {
        left += 1;
        return value;
      }
      return formatNumber(parsed, shape);
    });

    if (changed === 0) {
      return { output: input, summary: ui.tools.nothingChanged, warnings: [strings.nothing] };
    }

    return {
      output: withRows(input, rows),
      summary: format(strings.summary, { cells: cellsPhrase(changed) }),
      stats: { changed, left },
      ...(left > 0 ? { warnings: [plural(left, strings.left)] } : {}),
    };
  },
  check(input) {
    // A column is worth a look when its numbers disagree about the decimal mark.
    let cells = 0;
    for (const column of input.columns) {
      let commas = 0;
      let points = 0;
      for (const row of input.rows) {
        const value = cell(row, column.id);
        if (parseNumber(value) === null) continue;
        const mark = decimalMarkOf(value);
        if (mark === ',') commas += 1;
        else if (mark === '.') points += 1;
      }
      if (commas > 0 && points > 0) cells += Math.min(commas, points);
    }
    if (cells === 0) return null;
    return { summary: plural(cells, strings.found), count: cells, options: { column: '' } };
  },
};
