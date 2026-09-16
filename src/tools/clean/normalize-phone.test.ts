import { describe, expect, it } from 'vitest';
import { normalizePhoneTool } from './normalize-phone';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const DEFAULTS = { column: '', country: '46', shape: 'e164', keepUnparsed: true };

function phone(value: string, options: Record<string, unknown> = {}): string {
  const result = normalizePhoneTool.run(listOf(value), { ...DEFAULTS, ...options });
  return cell(result.output.rows[0]!, VALUE_COLUMN);
}

describe('normalize phone tool', () => {
  it('brings the six ways a Swedish mobile is written to one', () => {
    for (const written of [
      '070-123 45 67',
      '070 123 45 67',
      '0701234567',
      '+46 70 123 45 67',
      '+46701234567',
      '0046701234567',
    ]) {
      expect(phone(written)).toBe('+46701234567');
    }
  });

  it('keeps a number that already carries another country code', () => {
    expect(phone('+44 20 7946 0958')).toBe('+442079460958');
  });

  it('drops the national trunk zero rather than keeping it after the country code', () => {
    expect(phone('08-123 456')).toBe('+468123456');
  });

  it('adds the country code to a number written without the trunk zero', () => {
    expect(phone('701234567')).toBe('+46701234567');
  });

  it('accepts the punctuation people actually type', () => {
    expect(phone('(070) 123.45/67')).toBe('+46701234567');
  });

  it('can write the number grouped, or as bare digits', () => {
    expect(phone('0701234567', { shape: 'spaced' })).toBe('+46 701 234 567');
    expect(phone('0701234567', { shape: 'digits' })).toBe('46701234567');
  });

  it('leaves anything that is not a phone number alone', () => {
    expect(phone('anna@example.com')).toBe('anna@example.com');
    expect(phone('ring mig')).toBe('ring mig');
  });

  it('rejects a run of digits too short or too long to be a number', () => {
    expect(phone('12345')).toBe('12345');
    expect(phone('+1234567890123456')).toBe('+1234567890123456');
  });

  it('can be told to empty what it could not read instead of keeping it', () => {
    expect(phone('not a number', { keepUnparsed: false })).toBe('');
  });

  it('leaves empty cells alone and does not count them', () => {
    const result = normalizePhoneTool.run(listOf('', '0701234567'), DEFAULTS);
    expect(cell(result.output.rows[0]!, VALUE_COLUMN)).toBe('');
    expect(result.summary).toBe('Normalised 1 of 1 numbers');
  });

  it('works without a country code, keeping only what is already international', () => {
    expect(phone('+46701234567', { country: '' })).toBe('+46701234567');
    expect(phone('0701234567', { country: '' })).toBe('+0701234567');
  });

  it('ignores a plus typed into the country code field', () => {
    expect(phone('0701234567', { country: '+46' })).toBe('+46701234567');
  });

  it('counts what it read and warns about what it did not', () => {
    const result = normalizePhoneTool.run(listOf('0701234567', 'ring mig'), DEFAULTS);
    expect(result.summary).toBe('Normalised 1 of 2 numbers');
    expect(result.stats).toEqual({ normalized: 1, unparsed: 1 });
    expect(result.warnings?.[0]).toBe(
      '1 value did not look like a phone number and was left as it is.',
    );
  });

  it('reports nothing changed when every number is already in shape', () => {
    const result = normalizePhoneTool.run(listOf('+46701234567'), DEFAULTS);
    expect(result.summary).toBe('Nothing changed.');
  });

  it('never mutates its input', () => {
    const dataset = listOf('070-123 45 67');
    const before = JSON.stringify(dataset);
    normalizePhoneTool.run(dataset, DEFAULTS);
    expect(JSON.stringify(dataset)).toBe(before);
  });

  it('works on one column, never on all of them at once', () => {
    const column = normalizePhoneTool.options.find((field) => field.key === 'column');
    expect(column?.type === 'column' && column.allowAll).toBeUndefined();
    const table = tableOf(['a', 'b'], [{ a: '070-123 45 67', b: '070-123 45 67' }]);
    const output = normalizePhoneTool.run(table, { ...DEFAULTS, column: 'b' }).output;
    expect(cell(output.rows[0]!, 'a')).toBe('070-123 45 67');
    expect(cell(output.rows[0]!, 'b')).toBe('+46701234567');
  });
});

describe('normalize phone check', () => {
  function check(values: string[]) {
    return normalizePhoneTool.check?.(listOf(...values)) ?? null;
  }

  it('points at a column of numbers written more than one way', () => {
    // 0701234569 would pass as a personnummer by Luhn chance, so the bare one is 073.
    const finding = check(['070-123 45 67', '+46 70 123 45 68', '0731234567', 'ring mig']);
    expect(finding).toEqual({
      summary: '3 phone numbers are written more than one way',
      count: 3,
      options: { column: VALUE_COLUMN },
    });
  });

  it('says nothing when every number is written the same way', () => {
    expect(check(['070-123 45 67', '070-123 45 68', '070-123 45 69'])).toBeNull();
  });

  it('says nothing about a column that is mostly not numbers', () => {
    expect(check(['0701234567', '+46701234568', 'Anna', 'Bo', 'Carl', 'Dora'])).toBeNull();
  });

  it('does not mistake dates or identity numbers for phone numbers', () => {
    expect(check(['2026-09-15', '15/09/2026', '20260915'])).toBeNull();
    expect(check(['811278-9865', '19811278-9865', '8112789865'])).toBeNull();
  });

  it('says nothing about names or an empty list', () => {
    expect(check(['Anna', 'Bo'])).toBeNull();
    expect(check([])).toBeNull();
  });
});
