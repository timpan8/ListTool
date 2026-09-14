import { describe, expect, it } from 'vitest';
import { emailsInTextParser, findEmails } from './emails-in-text';
import { cell, VALUE_COLUMN } from '../core/model';
import { THREE_LINES } from '../test/fixtures';

const PROSE =
  'Hi all, please write to Anna (Anna@Example.com) or bob@example.com.\nCc: anna@example.com — thanks!';

function values(input: string, options: Record<string, unknown> = {}): string[] {
  return emailsInTextParser.parse(input, options).rows.map((row) => cell(row, VALUE_COLUMN));
}

describe('emails in text', () => {
  it('finds addresses inside prose and punctuation', () => {
    expect(findEmails(PROSE)).toEqual([
      'Anna@Example.com',
      'bob@example.com',
      'anna@example.com',
    ]);
  });

  it('lowercases and dedupes by default', () => {
    expect(values(PROSE)).toEqual(['anna@example.com', 'bob@example.com']);
  });

  it('keeps every occurrence when dedupe is off', () => {
    expect(values(PROSE, { dedupe: false })).toHaveLength(3);
  });

  it('keeps the original case when lowercasing is off', () => {
    expect(values(PROSE, { lowercase: false, dedupe: false })[0]).toBe('Anna@Example.com');
  });

  it('does not treat two spellings as one when case is kept', () => {
    expect(values(PROSE, { lowercase: false })).toHaveLength(3);
  });

  it('names the column Email', () => {
    expect(emailsInTextParser.parse(PROSE, {}).columns[0]?.name).toBe('Email');
  });

  it('finds nothing in text with no addresses', () => {
    expect(values(THREE_LINES)).toEqual([]);
  });

  it('ignores a trailing dot after an address', () => {
    expect(findEmails('write to a@example.com.')).toEqual(['a@example.com']);
  });

  it('handles a plus-addressed mailbox', () => {
    expect(findEmails('a+tag@example.com')).toEqual(['a+tag@example.com']);
  });
});

describe('emails detection', () => {
  it('offers itself when the text holds an address', () => {
    expect(emailsInTextParser.detect(PROSE)?.confidence).toBe(0.1);
  });

  it('never outranks a parser that recognises real structure', () => {
    expect(emailsInTextParser.detect(PROSE)!.confidence).toBeLessThan(0.6);
  });

  it('declines text with no addresses', () => {
    expect(emailsInTextParser.detect(THREE_LINES)).toBeNull();
  });
});
