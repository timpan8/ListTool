import { cell, type Row } from '../../core/model';
import { booleanOption, stringOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format, plural } from '../../i18n/format';
import { rowIdsAfter, rowsPhrase, targetColumn, withRows } from '../helpers';

const strings = ui.tools.splitIntoRows;

/** "a@example.com; b@example.com": a delimiter with another address after it. */
const DELIMITED_ADDRESSES = /([;,])\s*[^\s;,<>@]+@[^\s;,<>@]+/u;

/** The share of a column's filled cells that must hold several addresses before it is worth a look. */
const SHAPED_SHARE = 0.6;

export const splitIntoRowsTool: Tool = {
  id: 'split-into-rows',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['split', 'explode', 'rows', 'unnest', 'expand', 'delimiter', 'one per line'],
  arity: 'single',
  options: [
    { key: 'column', label: ui.tools.shared.column, type: 'column' },
    { key: 'delimiter', label: ui.parsers.delimited.delimiter, type: 'delimiter', default: ',' },
    { key: 'trim', label: strings.trim, type: 'boolean', default: true },
    { key: 'dropEmpty', label: strings.dropEmpty, type: 'boolean', default: true },
  ],
  run(input, options) {
    const source = targetColumn(input, options);
    const delimiter = stringOption(options, 'delimiter', ',');
    if (source === undefined || delimiter === '') {
      return { output: input, summary: ui.tools.nothingChanged };
    }

    const trim = booleanOption(options, 'trim', true);
    const dropEmpty = booleanOption(options, 'dropEmpty', true);

    const rows: Row[] = [];
    const nextId = rowIdsAfter(input);
    for (const row of input.rows) {
      const parts = cell(row, source.id)
        .split(delimiter)
        .map((part) => (trim ? part.trim() : part))
        .filter((part) => !dropEmpty || part !== '');

      // A row whose cell held nothing usable still exists — dropping it would be a
      // second, silent edit. It keeps one row with an empty cell.
      const values = parts.length === 0 ? [''] : parts;
      values.forEach((value, at) => {
        // Every other column is repeated, which is what makes the new rows readable. The
        // first part is still this row; the rest are new rows.
        rows.push({ id: at === 0 ? row.id : nextId(), cells: { ...row.cells, [source.id]: value } });
      });
    }

    if (rows.length === input.rows.length) {
      return { output: input, summary: ui.tools.nothingChanged, warnings: [strings.nothing] };
    }

    return {
      output: withRows(input, rows),
      summary: format(strings.summary, {
        before: rowsPhrase(input.rows.length),
        after: rowsPhrase(rows.length),
      }),
      stats: { before: input.rows.length, after: rows.length },
    };
  },
  check(input) {
    // Only the one shape that is unmistakable: several addresses in one cell. Anything
    // else with a comma in it is more often a sentence than a list.
    for (const column of input.columns) {
      let filled = 0;
      let shaped = 0;
      let delimiter = '';
      for (const row of input.rows) {
        const value = cell(row, column.id).trim();
        if (value === '') continue;
        filled += 1;
        const match = DELIMITED_ADDRESSES.exec(value);
        if (match === null) continue;
        shaped += 1;
        if (delimiter === '') delimiter = match[1] ?? '';
      }
      if (shaped === 0 || shaped / filled < SHAPED_SHARE) continue;
      return {
        summary: plural(shaped, strings.found),
        count: shaped,
        options: { column: column.id, delimiter },
      };
    }
    return null;
  },
};
