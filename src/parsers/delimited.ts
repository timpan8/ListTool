import { detectDelimiter, splitLines } from '../core/detect';
import {
  columnId,
  draftDataset,
  makeRow,
  valuesDataset,
  type Column,
  type Row,
} from '../core/model';
import { booleanOption, stringOption, type Options, type Parser } from '../core/registry';
import { ui } from '../i18n';
import { format } from '../i18n/format';

const strings = ui.parsers.delimited;

interface Settings {
  delimiter: string;
  trim: boolean;
  dropEmpty: boolean;
  splitIntoColumns: boolean;
}

function settingsOf(options: Options): Settings {
  return {
    delimiter: stringOption(options, 'delimiter', ','),
    trim: booleanOption(options, 'trim', true),
    dropEmpty: booleanOption(options, 'dropEmpty', true),
    splitIntoColumns: booleanOption(options, 'splitIntoColumns', false),
  };
}

function splitLine(line: string, settings: Settings): string[] {
  // A newline delimiter is already consumed by the line split, so the line is one item.
  const parts = settings.delimiter === '\n' ? [line] : line.split(settings.delimiter);
  return settings.trim ? parts.map((part) => part.trim()) : parts;
}

function toRows(lines: string[], settings: Settings): { columns: Column[]; rows: Row[] } {
  const cellRows = lines.map((line) => splitLine(line, settings));
  const kept = settings.dropEmpty
    ? cellRows.filter((cells) => cells.some((value) => value.trim() !== ''))
    : cellRows;
  const width = kept.reduce((widest, cells) => Math.max(widest, cells.length), 1);

  const columns: Column[] = Array.from({ length: width }, (_, index) => ({
    id: columnId(index),
    name: format(ui.columns.numbered, { n: index + 1 }),
  }));

  const rows = kept.map((cells, index) =>
    makeRow(
      index,
      Object.fromEntries(columns.map((column, at) => [column.id, cells[at] ?? ''])),
    ),
  );

  return { columns, rows };
}

export const delimitedParser: Parser = {
  id: 'delimited',
  name: strings.name,
  description: strings.description,
  options: [
    { key: 'delimiter', label: strings.delimiter, type: 'delimiter', default: ',' },
    { key: 'trim', label: strings.trim, type: 'boolean', default: true },
    { key: 'dropEmpty', label: strings.dropEmpty, type: 'boolean', default: true },
    {
      key: 'splitIntoColumns',
      label: strings.splitIntoColumns,
      type: 'boolean',
      default: false,
      help: strings.splitHelp,
    },
  ],

  /**
   * Wins on a single line that carries a delimiter — SPEC §3's "single line with a
   * delimiter → split into rows". Tabular text is left to the CSV parser, which claims
   * more confidence on multi-line input.
   */
  detect(input) {
    const detected = detectDelimiter(input);
    if (detected === null) return null;
    return {
      confidence: 0.7,
      options: { delimiter: detected.delimiter, splitIntoColumns: false },
    };
  },

  parse(input, options) {
    const settings = settingsOf(options);
    const parse = { parserId: 'delimited', options };
    const lines = splitLines(input);

    if (settings.splitIntoColumns) {
      const { columns, rows } = toRows(lines, settings);
      return draftDataset({ columns, rows, rawInput: input, parse });
    }

    const items = lines.flatMap((line) => splitLine(line, settings));
    const kept = settings.dropEmpty ? items.filter((item) => item.trim() !== '') : items;
    return valuesDataset(kept, ui.columns.value, input, parse);
  },
};
