import { describe, expect, it } from 'vitest';
import { parseEntry, recipientsParser, splitEntries, splitTopLevel } from './recipients';
import { cell } from '../core/model';
import { bestParser } from '../core/detect';
import { parsers } from './index';
import {
  CRLF_TRAILING_SEMICOLON,
  CSV_WITH_HEADER,
  OUTLOOK_RECIPIENTS,
  QUOTED_AND_BARE,
  SWEDISH_RECIPIENT,
  THREE_LINES,
} from '../test/fixtures';

function rows(input: string, options: Record<string, unknown> = {}) {
  return recipientsParser
    .parse(input, options)
    .rows.map((row) => [cell(row, 'first'), cell(row, 'last'), cell(row, 'email')]);
}

describe("the Outlook fixture from SPEC §4, verbatim", () => {
  it('parses to first, last and email with Last First', () => {
    expect(rows(OUTLOOK_RECIPIENTS)).toEqual([
      ['first1', 'last1', 'last1.first1@exempel.com'],
      ['first2', 'last2', 'first2.last2@exempel.com'],
      ['first3', 'last3', 'first3.last3@exempel.com'],
    ]);
  });

  it('never infers the order from the email local part', () => {
    // Row 1 is last.first@ and rows 2-3 are first.last@ — the setting decides, not the address.
    const swapped = rows(OUTLOOK_RECIPIENTS, { nameOrder: 'first-last' });
    expect(swapped).toEqual([
      ['last1', 'first1', 'last1.first1@exempel.com'],
      ['last2', 'first2', 'first2.last2@exempel.com'],
      ['last3', 'first3', 'first3.last3@exempel.com'],
    ]);
  });

  it('keeps the original entry alongside the parsed parts', () => {
    const dataset = recipientsParser.parse(OUTLOOK_RECIPIENTS, {});
    expect(cell(dataset.rows[0]!, 'original')).toBe('last1 first1 <last1.first1@exempel.com>');
  });

  it('produces the four deterministic columns', () => {
    expect(recipientsParser.parse(OUTLOOK_RECIPIENTS, {}).columns.map((c) => c.id)).toEqual([
      'first',
      'last',
      'email',
      'original',
    ]);
  });
});

describe('the shapes SPEC §4 lists', () => {
  it('keeps a comma inside quotes out of the split, and reads it as Last, First', () => {
    expect(rows(QUOTED_AND_BARE)).toEqual([
      ['Anna', 'Andersson', 'anna.andersson@example.com'],
      ['', '', 'bob@example.com'],
    ]);
  });

  it('reads an unquoted "Lastname, Firstname" the same way', () => {
    expect(rows('Andersson, Anna <anna@example.com>')).toEqual([
      ['Anna', 'Andersson', 'anna@example.com'],
    ]);
  });

  it('reads a quoted name as Last, First whichever order is set', () => {
    expect(rows('"Andersson, Anna" <a@example.com>', { nameOrder: 'first-last' })).toEqual([
      ['Anna', 'Andersson', 'a@example.com'],
    ]);
  });

  it('handles Swedish characters in the name and the local part', () => {
    expect(rows(SWEDISH_RECIPIENT)).toEqual([['Åsa', 'Öberg', 'asa.oberg@example.com']]);
  });

  it('handles CRLF and a trailing semicolon', () => {
    expect(rows(CRLF_TRAILING_SEMICOLON)).toEqual([
      ['first1', 'last1', 'last1.first1@example.com'],
      ['first2', 'last2', 'last2.first2@example.com'],
    ]);
  });

  it('takes one record per line', () => {
    expect(rows('a b <ab@example.com>\nc d <cd@example.com>')).toHaveLength(2);
  });

  it('splits a comma-separated list of bare addresses', () => {
    expect(rows('anna@example.com, bob@example.com')).toEqual([
      ['', '', 'anna@example.com'],
      ['', '', 'bob@example.com'],
    ]);
  });

  it('handles a mixture of separators in one input', () => {
    expect(rows('a b <ab@example.com>; c d <cd@example.com>\ne f <ef@example.com>')).toHaveLength(
      3,
    );
  });

  it('is empty for empty input', () => {
    expect(rows('')).toEqual([]);
    expect(rows('  ;  ; ')).toEqual([]);
  });
});

describe('name splitting', () => {
  it('gives a lone token to last', () => {
    expect(parseEntry('Andersson <a@example.com>', 'last-first')).toMatchObject({
      first: '',
      last: 'Andersson',
    });
  });

  it('keeps a middle name with the first name under Last First', () => {
    expect(parseEntry('Andersson Anna Maria <a@example.com>', 'last-first')).toMatchObject({
      last: 'Andersson',
      first: 'Anna Maria',
    });
  });

  it('keeps a middle name with the first name under First Last', () => {
    expect(parseEntry('Anna Maria Andersson <a@example.com>', 'first-last')).toMatchObject({
      last: 'Andersson',
      first: 'Anna Maria',
    });
  });

  it('accepts a display name with no address at all', () => {
    expect(parseEntry('Andersson Anna', 'last-first')).toMatchObject({
      last: 'Andersson',
      first: 'Anna',
      email: '',
    });
  });

  it('accepts an address with no display name', () => {
    expect(parseEntry('<a@example.com>', 'last-first')).toMatchObject({
      first: '',
      last: '',
      email: 'a@example.com',
    });
  });

  it('trims stray whitespace around the address', () => {
    expect(parseEntry('Anna  <  a@example.com  >', 'last-first').email).toBe('a@example.com');
  });
});

describe('splitting', () => {
  it('never splits inside quotes', () => {
    expect(splitTopLevel('"a, b" <x@example.com>, c', ',')).toEqual([
      '"a, b" <x@example.com>',
      'c',
    ]);
  });

  it('never splits inside angle brackets', () => {
    expect(splitTopLevel('a <x;y@example.com>; b', ';')).toEqual(['a <x;y@example.com>', 'b']);
  });

  it('always treats a newline as a separator', () => {
    expect(splitTopLevel('a\nb', ';')).toEqual(['a', 'b']);
  });

  it('splits only on newlines when asked for newline records', () => {
    expect(splitEntries('a, b\nc', '')).toEqual(['a, b', 'c']);
  });

  it('splits on commas only when an entry still holds two addresses', () => {
    expect(splitEntries('Andersson, Anna <a@example.com>', 'auto')).toEqual([
      'Andersson, Anna <a@example.com>',
    ]);
    expect(splitEntries('a@example.com, b@example.com', 'auto')).toHaveLength(2);
  });
});

describe('recipients detection', () => {
  it('claims a list of Name <email> entries', () => {
    expect(recipientsParser.detect(OUTLOOK_RECIPIENTS)?.confidence).toBe(0.9);
  });

  it('claims a list of bare addresses', () => {
    expect(recipientsParser.detect('a@example.com\nb@example.com')).not.toBeNull();
  });

  it('leaves a CSV that merely has an email column alone', () => {
    expect(recipientsParser.detect(CSV_WITH_HEADER)).toBeNull();
  });

  it('declines plain lines', () => {
    expect(recipientsParser.detect(THREE_LINES)).toBeNull();
  });

  it('declines empty input', () => {
    expect(recipientsParser.detect('')).toBeNull();
  });

  it('declines when fewer than 60 % of the entries are recipients', () => {
    expect(recipientsParser.detect('a@example.com; plain text; more text; and more')).toBeNull();
  });
});

describe('a CSV is not a recipient list', () => {
  const TIGHT_CSV = 'first,last,email\nAnna,Andersson,anna@example.com\nBo,Berg,bo@example.com';

  it('declines a comma-separated file whose rows have no spaces', () => {
    // Each row contains an address but is not one; a contains-check would claim it.
    expect(recipientsParser.detect(TIGHT_CSV)).toBeNull();
  });

  it('leaves such a file to the CSV parser', () => {
    expect(bestParser(parsers, TIGHT_CSV)?.parser.id).toBe('csv');
  });

  it('still claims a bare address on its own line', () => {
    expect(recipientsParser.detect('anna@example.com\nbo@example.com')).not.toBeNull();
  });

  it('does not read a whole CSV row as one address', () => {
    expect(parseEntry('Anna,Andersson,anna@example.com', 'last-first').email).toBe('');
  });
});
