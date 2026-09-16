import { parseDate } from '../../core/dates';
import { cell, type Column, type Dataset, type Row } from '../../core/model';
import { parseNumber } from '../../core/number';
import { stringOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format } from '../../i18n/format';
import { rowIdsAfter, rowsPhrase, withColumns } from '../helpers';

const strings = ui.tools.headerRow;

/** A header plus at least two rows of data: fewer and the first row is anyone's guess. */
const MIN_ROWS = 3;

/** How much of a column must hold numbers, dates or addresses for a text cell on top to stand out. */
const TYPED_SHARE = 0.8;

/** The parsers name columns they could not name; those are the names to replace. */
function namesAreGeneric(dataset: Dataset): boolean {
  return dataset.columns.every(
    (column, index) => column.name === format(ui.columns.numbered, { n: index + 1 }),
  );
}

function isTyped(value: string): boolean {
  return parseNumber(value) !== null || value.includes('@') || parseDate(value) !== null;
}

/**
 * Does the first row look like column names? Every cell filled, distinct and plain text,
 * over at least one column whose other cells are numbers, dates or addresses.
 */
function looksLikeHeader(dataset: Dataset): boolean {
  const [first, ...rest] = dataset.rows;
  if (first === undefined || dataset.rows.length < MIN_ROWS || !namesAreGeneric(dataset)) {
    return false;
  }
  const names = dataset.columns.map((column) => cell(first, column.id).trim().toLowerCase());
  if (names.some((name) => name === '' || isTyped(name))) return false;
  if (new Set(names).size !== names.length) return false;

  return dataset.columns.some((column) => {
    const filled = rest.map((row) => cell(row, column.id).trim()).filter((value) => value !== '');
    if (filled.length < 2) return false;
    return filled.filter(isTyped).length / filled.length >= TYPED_SHARE;
  });
}

export const headerRowTool: Tool = {
  id: 'header-row',
  name: strings.name,
  category: 'columns',
  description: strings.description,
  keywords: ['header', 'first row', 'names', 'promote', 'demote', 'titles', 'headings'],
  arity: 'single',
  options: [
    {
      key: 'mode',
      label: strings.mode,
      type: 'select',
      default: 'promote',
      choices: [
        { value: 'promote', label: strings.promote },
        { value: 'demote', label: strings.demote },
      ],
    },
  ],
  run(input, options) {
    const promote = stringOption(options, 'mode', 'promote') === 'promote';

    if (promote) {
      const first = input.rows[0];
      if (first === undefined) {
        return { output: input, summary: ui.tools.nothingChanged, warnings: [strings.noRows] };
      }

      // Ids never change: only the names do, and the row that gave them goes.
      const columns: Column[] = input.columns.map((column, index) => {
        const name = cell(first, column.id).trim();
        return { id: column.id, name: name === '' ? format(strings.blankName, { n: index + 1 }) : name };
      });
      const rows = input.rows.slice(1);

      return {
        output: withColumns(input, columns, rows),
        summary: format(strings.promoteSummary, {
          before: rowsPhrase(input.rows.length),
          after: rowsPhrase(rows.length),
        }),
        stats: { rows: rows.length },
      };
    }

    // Demote: the names become a row, and the columns get plain numbered names —
    // keeping both would leave the same text in two places.
    const header: Row = {
      id: rowIdsAfter(input)(),
      cells: Object.fromEntries(input.columns.map((column) => [column.id, column.name])),
    };
    const rows = [header, ...input.rows];
    const columns = input.columns.map((column, index) => ({
      id: column.id,
      name: format(strings.blankName, { n: index + 1 }),
    }));

    return {
      output: withColumns(input, columns, rows),
      summary: format(strings.demoteSummary, {
        before: rowsPhrase(input.rows.length),
        after: rowsPhrase(rows.length),
      }),
      stats: { rows: rows.length },
    };
  },
  check(input) {
    if (!looksLikeHeader(input)) return null;
    return { summary: strings.found, count: 1, options: { mode: 'promote' } };
  },
};
