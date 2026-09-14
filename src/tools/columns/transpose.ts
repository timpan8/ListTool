import { cell, columnId, draftDataset, makeRow, type Column } from '../../core/model';
import { booleanOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { rowsPhrase } from '../helpers';

const strings = en.tools.transpose;

/** The column holding the old column names — the row labels of the turned table. */
const FIELD_COLUMN = 'field';

export const transposeTool: Tool = {
  id: 'transpose',
  name: strings.name,
  category: 'columns',
  description: strings.description,
  keywords: ['transpose', 'rotate', 'flip', 'pivot', 'turn', 'rows to columns'],
  arity: 'single',
  options: [{ key: 'header', label: strings.header, type: 'boolean', default: false }],
  run(input, options) {
    if (input.rows.length === 0 || input.columns.length === 0) {
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.empty] };
    }

    const header = booleanOption(options, 'header', false);
    const naming = header ? input.columns[0] : undefined;
    // With a naming column, that column is consumed by the new headings rather than
    // becoming a row of its own.
    const sources = naming === undefined ? input.columns : input.columns.slice(1);

    const columns: Column[] = [
      { id: FIELD_COLUMN, name: strings.columnName },
      ...input.rows.map((row, index) => ({
        id: columnId(index),
        name:
          naming === undefined
            ? format(strings.rowName, { n: index + 1 })
            : cell(row, naming.id),
      })),
    ];

    const rows = sources.map((source, index) => {
      const cells: Record<string, string> = { [FIELD_COLUMN]: source.name };
      input.rows.forEach((row, position) => {
        cells[columnId(position)] = cell(row, source.id);
      });
      return makeRow(index, cells);
    });

    return {
      // A transposed table has nothing to do with the text it was parsed from, so the
      // raw input and the parse options are deliberately dropped.
      output: { ...draftDataset({ columns, rows }), id: input.id, name: input.name },
      summary: format(strings.summary, {
        before: rowsPhrase(input.rows.length),
        after: rowsPhrase(rows.length),
      }),
      stats: { rows: rows.length, columns: columns.length },
    };
  },
};
