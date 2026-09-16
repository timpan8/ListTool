import { cell, type Column, type Row } from '../../core/model';
import { booleanOption, defaultOptions, stringOption, type Tool } from '../../core/registry';
import { defaultParser, parserById, parsers } from '../../parsers';
import { ui } from '../../i18n';
import { format, plural } from '../../i18n/format';
import { freeColumnId, targetColumn, withColumns } from '../helpers';

const strings = ui.tools.parseColumn;

/**
 * The parser registry, offered inside a tool. "Read this column as recipients" is the
 * same idea as "read this paste as recipients", so it is the same parsers — adding one
 * makes it available here too, with nothing to wire up.
 */
const PARSER_CHOICES = parsers.map((parser) => ({ value: parser.id, label: parser.name }));

export const parseColumnTool: Tool = {
  id: 'parse-column',
  name: strings.name,
  category: 'columns',
  description: strings.description,
  keywords: ['parse', 'read', 'split', 'recipients', 'extract', 'expand', 'column', 'inside'],
  arity: 'single',
  options: [
    { key: 'column', label: ui.tools.shared.column, type: 'column' },
    {
      key: 'parserId',
      label: strings.parser,
      type: 'select',
      default: 'recipients',
      choices: PARSER_CHOICES,
    },
    { key: 'prefix', label: strings.prefix, type: 'text', default: '' },
    { key: 'keepOriginal', label: strings.keepOriginal, type: 'boolean', default: true },
  ],
  run(input, options) {
    const source = targetColumn(input, options);
    if (source === undefined) return { output: input, summary: ui.tools.nothingChanged };

    const parser = parserById(stringOption(options, 'parserId', 'recipients')) ?? defaultParser;

    // Each cell is read on its own, with the parser's own defaults, and only its first
    // row is taken: this widens a row, it never multiplies one. Splitting a cell into
    // rows is its own tool.
    const parserOptions = defaultOptions(parser.options);
    const parsedRows = input.rows.map((row) =>
      parser.parse(cell(row, source.id), parserOptions),
    );

    const shape = parsedRows.find((dataset) => dataset.rows.length > 0);
    if (shape === undefined) {
      return { output: input, summary: ui.tools.nothingChanged, warnings: [strings.nothing] };
    }

    const prefix = stringOption(options, 'prefix', '');
    const keepOriginal = booleanOption(options, 'keepOriginal', true);
    const base = keepOriginal
      ? input.columns
      : input.columns.filter((column) => column.id !== source.id);

    const added: { column: Column; from: string }[] = [];
    for (const column of shape.columns) {
      const id = freeColumnId(
        { columns: [...base, ...added.map((entry) => entry.column)] },
        column.id,
      );
      added.push({ column: { id, name: `${prefix}${column.name}` }, from: column.id });
    }

    let unreadable = 0;
    const rows: Row[] = input.rows.map((row, index) => {
      const first = parsedRows[index]?.rows[0];
      if (first === undefined && cell(row, source.id).trim() !== '') unreadable += 1;

      const cells: Record<string, string> = {};
      for (const column of base) cells[column.id] = cell(row, column.id);
      for (const entry of added) {
        cells[entry.column.id] = first === undefined ? '' : cell(first, entry.from);
      }
      return { id: row.id, cells };
    });

    return {
      output: withColumns(input, [...base, ...added.map((entry) => entry.column)], rows),
      summary: format(strings.summary, {
        column: source.name,
        columns: plural(added.length, strings.columnCount),
      }),
      stats: { columns: added.length, unreadable },
      ...(unreadable > 0 ? { warnings: [plural(unreadable, strings.unreadable)] } : {}),
    };
  },
  check(input) {
    // A column of "Anna Andersson <anna@example.com>" is two columns waiting to happen.
    for (const column of input.columns) {
      let filled = 0;
      let shaped = 0;
      for (const row of input.rows) {
        const value = cell(row, column.id).trim();
        if (value === '') continue;
        filled += 1;
        if (NAME_AND_ADDRESS.test(value)) shaped += 1;
      }
      if (shaped === 0 || shaped / filled < SHAPED_SHARE) continue;
      return {
        summary: plural(shaped, strings.found),
        count: shaped,
        options: { column: column.id, parserId: 'recipients' },
      };
    }
    return null;
  },
};

/** "Display Name <local@domain>", possibly quoted: what a mail client hands over. */
const NAME_AND_ADDRESS = /^"?[^<>@"]+"?\s*<[^\s<>@]+@[^\s<>@]+>$/u;

/** The share of a column's filled cells that must have that shape before it is worth a look. */
const SHAPED_SHARE = 0.6;
