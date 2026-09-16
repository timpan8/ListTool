import { parse as papaParse } from 'papaparse';
import { columnId, draftDataset, makeRow, type Column } from '../core/model';
import { booleanOption, stringOption, type Parser } from '../core/registry';
import { detectDelimiter, nonEmptyLines } from '../core/detect';
import { ui } from '../i18n';
import { format } from '../i18n/format';

const strings = ui.parsers.csv;

/** '' asks PapaParse to detect the delimiter itself. */
const AUTO = '';

function rowsOf(input: string, delimiter: string): string[][] {
  const result = papaParse<string[]>(input, {
    delimiter,
    header: false,
    skipEmptyLines: 'greedy',
  });
  return result.data;
}

export const csvParser: Parser = {
  id: 'csv',
  name: strings.name,
  description: strings.description,
  options: [
    {
      key: 'delimiter',
      label: strings.delimiter,
      type: 'select',
      default: AUTO,
      choices: [
        { value: AUTO, label: strings.auto },
        { value: ',', label: ui.options.delimiters.comma },
        { value: ';', label: ui.options.delimiters.semicolon },
        { value: '\t', label: ui.options.delimiters.tab },
        { value: '|', label: ui.options.delimiters.pipe },
      ],
    },
    { key: 'header', label: strings.header, type: 'boolean', default: true },
  ],

  /**
   * Claims tabular text: two or more lines that all carry the same delimiter. A single
   * delimited line is a list, not a table, and is left to the Delimited parser.
   */
  detect(input) {
    const detected = detectDelimiter(input);
    if (detected === null || nonEmptyLines(input).length < 2) return null;
    return { confidence: 0.8, options: { delimiter: detected.delimiter, header: true } };
  },

  parse(input, options) {
    const delimiter = stringOption(options, 'delimiter', AUTO);
    const header = booleanOption(options, 'header', true);
    const parse = { parserId: 'csv', options };

    const data = rowsOf(input, delimiter);
    const headerRow = header ? data[0] : undefined;
    const bodyRows = header ? data.slice(1) : data;

    const width = data.reduce((widest, row) => Math.max(widest, row.length), 1);
    const columns: Column[] = Array.from({ length: width }, (_, index) => {
      const fromHeader = headerRow?.[index]?.trim();
      return {
        id: columnId(index),
        name:
          fromHeader !== undefined && fromHeader !== ''
            ? fromHeader
            : format(ui.columns.numbered, { n: index + 1 }),
      };
    });

    const rows = bodyRows.map((cells, index) =>
      makeRow(
        index,
        Object.fromEntries(columns.map((column, at) => [column.id, cells[at] ?? ''])),
      ),
    );

    return draftDataset({ columns, rows, rawInput: input, parse });
  },
};
