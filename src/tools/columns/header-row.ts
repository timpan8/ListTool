import { cell, type Column, type Row } from '../../core/model';
import { stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { rowIdsAfter, rowsPhrase, withColumns } from '../helpers';

const strings = en.tools.headerRow;

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
        return { output: input, summary: en.tools.nothingChanged, warnings: [strings.noRows] };
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
};
