import { dateShapeOf, formatDate, parseDate, type DateShape, type DayFirst } from '../../core/dates';
import { cell } from '../../core/model';
import { booleanOption, stringOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format, plural } from '../../i18n/format';
import { cellsPhrase, mapCells, targetColumns, withRows } from '../helpers';

const strings = ui.tools.normalizeDates;

function dayFirstOf(options: Record<string, unknown>): DayFirst {
  return stringOption(options, 'dayFirst', 'dmy') === 'mdy' ? 'mdy' : 'dmy';
}

function shapeOf(options: Record<string, unknown>): DateShape {
  const shape = stringOption(options, 'shape', 'iso');
  return shape === 'dmy' || shape === 'mdy' || shape === 'compact' ? shape : 'iso';
}

export const normalizeDatesTool: Tool = {
  id: 'normalize-dates',
  name: strings.name,
  category: 'clean',
  description: strings.description,
  keywords: ['date', 'dates', 'iso', 'format', 'normalise', 'normalize', 'yyyy-mm-dd', 'datum'],
  arity: 'single',
  options: [
    { key: 'column', label: ui.tools.shared.column, type: 'column', default: '', allowAll: true },
    {
      key: 'dayFirst',
      label: strings.dayFirst,
      type: 'select',
      default: 'dmy',
      choices: [
        { value: 'dmy', label: strings.dayFirstDmy },
        { value: 'mdy', label: strings.dayFirstMdy },
      ],
    },
    {
      key: 'shape',
      label: strings.shape,
      type: 'select',
      default: 'iso',
      choices: [
        { value: 'iso', label: strings.shapeIso },
        { value: 'dmy', label: strings.shapeDmy },
        { value: 'mdy', label: strings.shapeMdy },
        { value: 'compact', label: strings.shapeCompact },
      ],
    },
    { key: 'keepUnparsed', label: strings.keepUnparsed, type: 'boolean', default: true },
  ],
  run(input, options) {
    const dayFirst = dayFirstOf(options);
    const shape = shapeOf(options);
    const keep = booleanOption(options, 'keepUnparsed', true);
    let left = 0;

    const { rows, changed } = mapCells(input, targetColumns(input, options), (value) => {
      if (value.trim() === '') return value;
      const parts = parseDate(value, dayFirst);
      if (parts === null) {
        left += 1;
        return keep ? value : '';
      }
      return formatDate(parts, shape);
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
    // A column is worth a look when its dates are written in more than one shape.
    let cells = 0;
    for (const column of input.columns) {
      const shapes = new Set<string>();
      let dates = 0;
      for (const row of input.rows) {
        const shape = dateShapeOf(cell(row, column.id));
        if (shape === null) continue;
        dates += 1;
        shapes.add(shape);
      }
      if (shapes.size >= 2) cells += dates;
    }
    if (cells === 0) return null;
    return { summary: plural(cells, strings.found), count: cells, options: { column: '' } };
  },
};
