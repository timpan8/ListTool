import { columnId, draftDataset, makeRow, type Column } from '../core/model';
import { stringOption, type Parser } from '../core/registry';
import { ui } from '../i18n';
import { format } from '../i18n/format';

const strings = ui.parsers.htmlTable;

/**
 * Hand-written on purpose: the app loads no HTML parser, and what arrives here is the
 * clipboard's own markup from Excel, Word or a browser — well-formed enough for a table,
 * and wrapped in more styling than any of it needs. Nothing is ever rendered: every
 * value comes out as text.
 *
 * Known limit: a rowspan is not carried down into the rows below it, because guessing
 * where it lands would quietly invent values.
 */
const TABLE = /<table\b[^>]*>([\s\S]*?)<\/table\s*>/i;
const ROW = /<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi;
const CELL = /<(t[dh])\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
const COLSPAN = /\bcolspan\s*=\s*["']?(\d+)/i;

/**
 * The Latin-1 entity names, in code-point order from 160. Written as one line because
 * the position IS the code point — a lookup table of 96 pairs would say less, not more.
 */
const LATIN1 =
  'nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr ' +
  'deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 ' +
  'frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute ' +
  'Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml ' +
  'times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc ' +
  'atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml ' +
  'eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml ' +
  'yacute thorn yuml';

const NAMED = new Map<string, string>([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
  ['ndash', '\u2013'],
  ['mdash', '\u2014'],
  ['lsquo', '\u2018'],
  ['rsquo', '\u2019'],
  ['ldquo', '\u201c'],
  ['rdquo', '\u201d'],
  ['bull', '\u2022'],
  ['hellip', '\u2026'],
  ['euro', '\u20ac'],
  ['trade', '\u2122'],
  ...LATIN1.split(' ').map(
    (name, index): [string, string] => [name, String.fromCharCode(160 + index)],
  ),
  // Last, so it wins over the Latin-1 entry above: a non-breaking space in pasted markup
  // is layout, not data, and becomes an ordinary space — what Clean invisible characters
  // would do to it anyway.
  ['nbsp', ' '],
]);

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith('#')) {
      const code = body.startsWith('#x') || body.startsWith('#X')
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : match;
    }
    return NAMED.get(body) ?? NAMED.get(body.toLowerCase()) ?? match;
  });
}

/** One cell's markup as the text a person would see in it. */
function textOf(html: string): string {
  const withBreaks = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '');
  return decodeEntities(withBreaks).replace(/[ \t\r]+/g, ' ').trim();
}

interface ParsedRow {
  cells: string[];
  header: boolean;
}

function rowsOf(html: string): ParsedRow[] {
  const table = TABLE.exec(html);
  if (table === null) return [];

  const rows: ParsedRow[] = [];
  for (const [, body] of (table[1] ?? '').matchAll(ROW)) {
    const cells: string[] = [];
    let headerCells = 0;
    let total = 0;

    for (const [, tag, attributes, content] of (body ?? '').matchAll(CELL)) {
      total += 1;
      if ((tag ?? '').toLowerCase() === 'th') headerCells += 1;
      cells.push(textOf(content ?? ''));

      // A spanned cell keeps the columns after it lined up with the rows below.
      const span = COLSPAN.exec(attributes ?? '');
      const width = span === null ? 1 : Number.parseInt(span[1] ?? '1', 10);
      for (let extra = 1; extra < width; extra += 1) cells.push('');
    }

    if (cells.length > 0) rows.push({ cells, header: total > 0 && headerCells === total });
  }
  return rows;
}

export const htmlTableParser: Parser = {
  id: 'html-table',
  name: strings.name,
  description: strings.description,
  options: [
    {
      key: 'header',
      label: strings.header,
      type: 'select',
      default: 'auto',
      choices: [
        { value: 'auto', label: strings.headerAuto },
        { value: 'yes', label: strings.headerYes },
        { value: 'no', label: strings.headerNo },
      ],
    },
  ],

  /** Claims anything that actually contains a table element, and nothing else. */
  detect(input) {
    if (!TABLE.test(input)) return null;
    return { confidence: 0.95, options: { header: 'auto' } };
  },

  parse(input, options) {
    const parsed = rowsOf(input);
    const choice = stringOption(options, 'header', 'auto');
    const first = parsed[0];
    const header =
      choice === 'yes' || (choice === 'auto' && first !== undefined && first.header);

    const width = parsed.reduce((widest, row) => Math.max(widest, row.cells.length), 0);
    const names = header ? (first?.cells ?? []) : [];
    const columns: Column[] = Array.from({ length: width }, (_, index) => {
      const name = names[index];
      return {
        id: columnId(index),
        name:
          name === undefined || name === ''
            ? format(ui.columns.numbered, { n: index + 1 })
            : name,
      };
    });

    const body = header ? parsed.slice(1) : parsed;
    const rows = body.map((row, index) =>
      makeRow(
        index,
        Object.fromEntries(columns.map((column, at) => [column.id, row.cells[at] ?? ''])),
      ),
    );

    return draftDataset({
      columns,
      rows,
      rawInput: input,
      parse: { parserId: 'html-table', options },
    });
  },
};
