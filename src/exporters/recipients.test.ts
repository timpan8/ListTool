import { describe, expect, it } from 'vitest';
import { recipientsExporter } from './recipients';
import { recipientsParser } from '../parsers/recipients';
import { cell } from '../core/model';
import { listOf, OUTLOOK_RECIPIENTS, QUOTED_AND_BARE, tableOf } from '../test/fixtures';

const PEOPLE = tableOf(
  ['first', 'last', 'email'],
  [
    { first: 'Anna', last: 'Andersson', email: 'anna@example.com' },
    { first: 'Bo', last: 'Berg', email: 'bo@example.com' },
  ],
);

const BASE = {
  first: 'first',
  last: 'last',
  email: 'email',
  order: 'last-first',
  separator: '; ',
  quote: true,
};

describe('recipients exporter', () => {
  it('writes the shape Outlook expects', () => {
    expect(recipientsExporter.render(PEOPLE, BASE)).toBe(
      'Andersson Anna <anna@example.com>; Berg Bo <bo@example.com>',
    );
  });

  it('writes the other name order when asked', () => {
    expect(recipientsExporter.render(PEOPLE, { ...BASE, order: 'first-last' })).toBe(
      'Anna Andersson <anna@example.com>; Bo Berg <bo@example.com>',
    );
  });

  it('quotes a display name holding a comma, so it stays one recipient', () => {
    const comma = tableOf(
      ['first', 'last', 'email'],
      [{ first: 'Anna', last: 'Andersson,', email: 'anna@example.com' }],
    );
    expect(recipientsExporter.render(comma, BASE)).toBe(
      '"Andersson, Anna" <anna@example.com>',
    );
  });

  it('can be told not to quote', () => {
    const comma = tableOf(['last', 'email'], [{ last: 'A, B', email: 'a@example.com' }]);
    expect(recipientsExporter.render(comma, { ...BASE, quote: false })).toBe(
      'A, B <a@example.com>',
    );
  });

  it('writes a bare address when there is no name', () => {
    const bare = tableOf(['email'], [{ email: 'bo@example.com' }]);
    expect(recipientsExporter.render(bare, BASE)).toBe('bo@example.com');
  });

  it('leaves out a row with neither name nor address', () => {
    const gappy = tableOf(
      ['first', 'last', 'email'],
      [{ first: '', last: '', email: '' }, { first: 'Bo', last: '', email: 'bo@example.com' }],
    );
    expect(recipientsExporter.render(gappy, BASE)).toBe('Bo <bo@example.com>');
  });

  it('joins with whatever separator was chosen', () => {
    expect(recipientsExporter.render(PEOPLE, { ...BASE, separator: '\n' })).toBe(
      'Andersson Anna <anna@example.com>\nBerg Bo <bo@example.com>',
    );
  });

  it('finds the parser own columns without being told', () => {
    const parsed = recipientsParser.parse(OUTLOOK_RECIPIENTS, { nameOrder: 'last-first' });
    expect(recipientsExporter.render(parsed, { order: 'last-first', separator: '; ' })).toBe(
      OUTLOOK_RECIPIENTS,
    );
  });

  it('survives the round trip through the parser, quoted comma and all', () => {
    const parsed = recipientsParser.parse(QUOTED_AND_BARE, { nameOrder: 'first-last' });
    const written = recipientsExporter.render(parsed, { ...BASE, order: 'first-last' });
    const again = recipientsParser.parse(written, { nameOrder: 'first-last' });

    expect(again.rows.map((row) => cell(row, 'email'))).toEqual(
      parsed.rows.map((row) => cell(row, 'email')),
    );
  });

  it('reads a plain list of addresses as the addresses', () => {
    expect(recipientsExporter.render(listOf('a@example.com', 'b@example.com'), BASE)).toBe(
      'a@example.com; b@example.com',
    );
  });

  it('handles an empty list', () => {
    expect(recipientsExporter.render({ ...PEOPLE, rows: [] }, BASE)).toBe('');
  });

  it('never mutates the dataset it renders', () => {
    const before = JSON.stringify(PEOPLE);
    recipientsExporter.render(PEOPLE, BASE);
    expect(JSON.stringify(PEOPLE)).toBe(before);
  });
});
