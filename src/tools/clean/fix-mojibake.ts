import type { Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { cell } from '../../core/model';
import { cellsPhrase, mapCells, targetColumns, withRows } from '../helpers';

const strings = en.tools.fixMojibake;

/**
 * CP1252 puts printable characters at 0x80-0x9F, where Latin-1 has control codes. Text
 * written as UTF-8 and read as CP1252 shows them, so undoing that means mapping each one
 * back to the byte it stands for. The gaps in the range are genuinely undefined and are
 * absent here on purpose.
 */
const CP1252_HIGH = new Map<number, number>([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84], [0x2026, 0x85],
  [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89], [0x0160, 0x8a],
  [0x2039, 0x8b], [0x0152, 0x8c], [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b], [0x0153, 0x9c],
  [0x017e, 0x9e], [0x0178, 0x9f],
]);

/** The byte a single mis-decoded character stands for, or -1 when it stands for none. */
function byteOf(code: number): number {
  if (code <= 0xff) return code;
  return CP1252_HIGH.get(code) ?? -1;
}

/** Anything outside printable ASCII. Text without it cannot be mis-decoded UTF-8. */
const NON_ASCII = /[^ -~]/;

/** One decoder for the whole list: constructing one per cell was most of the cost. */
const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true });

/**
 * Read the string back as the bytes it was before someone decoded it wrongly, then
 * decode those bytes as UTF-8. Returns null when the text is not mis-decoded at all,
 * which is the common case and must be left exactly as it is.
 */
function repair(value: string): string | null {
  if (!NON_ASCII.test(value)) return null;
  const bytes: number[] = [];
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    const byte = byteOf(code);
    if (byte === -1) return null; // Something outside Latin-1: this text was decoded fine.
    bytes.push(byte);
  }

  try {
    const decoded = STRICT_UTF8.decode(Uint8Array.from(bytes));
    return decoded === value ? null : decoded;
  } catch {
    // Not valid UTF-8, so these bytes never were a mis-decoded UTF-8 string.
    return null;
  }
}

export const fixMojibakeTool: Tool = {
  id: 'fix-mojibake',
  name: strings.name,
  category: 'clean',
  description: strings.description,
  keywords: ['mojibake', 'encoding', 'utf-8', 'latin-1', 'garbled', 'åäö', 'Ã¤', 'charset'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column', default: '', allowAll: true },
  ],
  run(input, options) {
    const { rows, changed } = mapCells(input, targetColumns(input, options), (value) =>
      value === '' ? value : (repair(value) ?? value),
    );

    if (changed === 0) {
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.nothing] };
    }

    return {
      output: withRows(input, rows),
      summary: format(strings.summary, { cells: cellsPhrase(changed) }),
      stats: { changed },
    };
  },
  check(input) {
    const cells = input.rows.reduce(
      (count, row) =>
        count + input.columns.filter((column) => repair(cell(row, column.id)) !== null).length,
      0,
    );
    if (cells === 0) return null;
    return { summary: plural(cells, strings.foundCheck), count: cells, options: { column: '' } };
  },
};
