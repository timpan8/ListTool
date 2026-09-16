import { cell, type Row } from '../../core/model';
import { booleanOption, stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { rowIdsAfter, rowsPhrase, targetColumn, withRows } from '../helpers';

const strings = en.tools.splitIntoRows;

export const splitIntoRowsTool: Tool = {
  id: 'split-into-rows',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['split', 'explode', 'rows', 'unnest', 'expand', 'delimiter', 'one per line'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column' },
    { key: 'delimiter', label: en.parsers.delimited.delimiter, type: 'delimiter', default: ',' },
    { key: 'trim', label: strings.trim, type: 'boolean', default: true },
    { key: 'dropEmpty', label: strings.dropEmpty, type: 'boolean', default: true },
  ],
  run(input, options) {
    const source = targetColumn(input, options);
    const delimiter = stringOption(options, 'delimiter', ',');
    if (source === undefined || delimiter === '') {
      return { output: input, summary: en.tools.nothingChanged };
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
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.nothing] };
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
};
