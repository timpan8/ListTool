import { draftDataset, makeRow, type Column } from '../core/model';
import { stringOption, type Parser } from '../core/registry';
import { en } from '../i18n/en';

const strings = en.parsers.recipients;

/** Loose on purpose: it has to recognise addresses, not validate them. */
const EMAIL = /[^\s<>,;"]+@[^\s<>,;"]+\.[^\s<>,;"]+/;
const EMAIL_ALL = new RegExp(EMAIL.source, 'g');

export type NameOrder = 'last-first' | 'first-last';

export interface Recipient {
  first: string;
  last: string;
  email: string;
  original: string;
}

/**
 * Split on separators that are not inside quotes or inside an angle-bracketed address.
 * That is what keeps `"Andersson, Anna" <anna@example.com>` in one piece (RFC 5322 §3.4).
 */
export function splitTopLevel(input: string, separators: string): string[] {
  const entries: string[] = [];
  let current = '';
  let inQuotes = false;
  let inAngle = false;

  for (const char of input) {
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
      continue;
    }
    if (!inQuotes && char === '<') inAngle = true;
    if (!inQuotes && char === '>') inAngle = false;

    const isSeparator = !inQuotes && !inAngle && (separators.includes(char) || char === '\n');
    if (isSeparator) {
      entries.push(current);
      current = '';
      continue;
    }
    if (char !== '\r') current += char;
  }
  entries.push(current);
  return entries.map((entry) => entry.trim()).filter((entry) => entry !== '');
}

function countEmails(text: string): number {
  return text.match(EMAIL_ALL)?.length ?? 0;
}

/**
 * Auto splits on semicolons and newlines first, because an unquoted `Andersson, Anna`
 * is a name and not two recipients. Only an entry that still holds more than one address
 * is split on commas as well.
 */
export function splitEntries(input: string, separator: string): string[] {
  if (separator !== 'auto') return splitTopLevel(input, separator);

  return splitTopLevel(input, ';').flatMap((entry) =>
    countEmails(entry) > 1 ? splitTopLevel(entry, ',') : [entry],
  );
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  return quoted && trimmed.length > 1 ? trimmed.slice(1, -1).trim() : trimmed;
}

function splitName(display: string, order: NameOrder): { first: string; last: string } {
  const name = stripQuotes(display);
  if (name === '') return { first: '', last: '' };

  // "Lastname, Firstname" is unambiguous whichever order the setting says.
  const comma = name.indexOf(',');
  if (comma !== -1) {
    return {
      last: name.slice(0, comma).trim(),
      first: name.slice(comma + 1).trim(),
    };
  }

  const tokens = name.split(/\s+/).filter((token) => token !== '');
  if (tokens.length === 1) return { first: '', last: tokens[0] ?? '' };

  if (order === 'last-first') {
    return { last: tokens[0] ?? '', first: tokens.slice(1).join(' ') };
  }
  return { last: tokens[tokens.length - 1] ?? '', first: tokens.slice(0, -1).join(' ') };
}

export function parseEntry(entry: string, order: NameOrder): Recipient {
  const original = entry.trim();

  const angle = /^(.*)<([^<>]*)>\s*$/.exec(original);
  if (angle !== null) {
    const { first, last } = splitName(angle[1] ?? '', order);
    return { first, last, email: (angle[2] ?? '').trim(), original };
  }

  if (EMAIL.test(original) && !/\s/.test(original)) {
    return { first: '', last: '', email: original, original };
  }

  const { first, last } = splitName(original, order);
  return { first, last, email: '', original };
}

/** An entry that looks like a recipient rather than merely containing an address. */
function looksLikeRecipient(entry: string): boolean {
  if (/<[^<>]*@[^<>]*>\s*$/.test(entry.trim())) return true;
  return EMAIL.test(entry.trim()) && !/\s/.test(entry.trim());
}

const COLUMNS: Column[] = [
  { id: 'first', name: en.columns.first },
  { id: 'last', name: en.columns.last },
  { id: 'email', name: en.columns.email },
  { id: 'original', name: en.columns.original },
];

export const recipientsParser: Parser = {
  id: 'recipients',
  name: strings.name,
  description: strings.description,
  options: [
    {
      key: 'nameOrder',
      label: strings.nameOrder,
      type: 'select',
      default: 'last-first',
      choices: [
        { value: 'last-first', label: strings.lastFirst },
        { value: 'first-last', label: strings.firstLast },
      ],
      help: strings.orderHelp,
    },
    {
      key: 'separator',
      label: strings.separator,
      type: 'select',
      default: 'auto',
      choices: [
        { value: 'auto', label: strings.separatorAuto },
        { value: ';', label: strings.separatorSemicolon },
        { value: ',', label: strings.separatorComma },
        { value: '', label: strings.separatorNewline },
      ],
    },
  ],

  /** SPEC §3: 60 % or more of the top-level items looking like recipients wins. */
  detect(input) {
    const entries = splitEntries(input, 'auto');
    if (entries.length === 0) return null;
    const recipients = entries.filter(looksLikeRecipient).length;
    if (recipients / entries.length < 0.6) return null;
    return { confidence: 0.9, options: { nameOrder: 'last-first', separator: 'auto' } };
  },

  parse(input, options) {
    const order: NameOrder =
      stringOption(options, 'nameOrder', 'last-first') === 'first-last'
        ? 'first-last'
        : 'last-first';
    const separator = stringOption(options, 'separator', 'auto');

    const rows = splitEntries(input, separator).map((entry, index) => {
      const recipient = parseEntry(entry, order);
      return makeRow(index, {
        first: recipient.first,
        last: recipient.last,
        email: recipient.email,
        original: recipient.original,
      });
    });

    return draftDataset({
      columns: COLUMNS,
      rows,
      rawInput: input,
      parse: { parserId: 'recipients', options },
    });
  },
};
