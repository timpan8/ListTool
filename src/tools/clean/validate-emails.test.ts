import { describe, expect, it } from 'vitest';
import { isValidEmail, validateEmailsTool } from './validate-emails';
import { cell } from '../../core/model';
import { listOf } from '../../test/fixtures';

describe('isValidEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isValidEmail('anna@example.com')).toBe(true);
    expect(isValidEmail('a+tag@sub.example.co.uk')).toBe(true);
  });

  it('accepts one with surrounding whitespace', () => {
    expect(isValidEmail('  anna@example.com  ')).toBe(true);
  });

  it('rejects what a mail server would', () => {
    expect(isValidEmail('anna')).toBe(false);
    expect(isValidEmail('anna@')).toBe(false);
    expect(isValidEmail('@example.com')).toBe(false);
    expect(isValidEmail('anna@example')).toBe(false);
    expect(isValidEmail('anna example@example.com')).toBe(false);
    expect(isValidEmail('anna@@example.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects two addresses stuck together', () => {
    expect(isValidEmail('a@example.com,b@example.com')).toBe(false);
  });
});

describe('validate emails tool', () => {
  it('flags each row in a new column', () => {
    const output = validateEmailsTool.run(listOf('a@example.com', 'nope'), { column: 'value' })
      .output;
    expect(output.rows.map((row) => cell(row, 'valid'))).toEqual(['yes', 'no']);
  });

  it('keeps every row', () => {
    const output = validateEmailsTool.run(listOf('a@example.com', 'nope'), {}).output;
    expect(output.rows).toHaveLength(2);
  });

  it('reports how many look malformed', () => {
    expect(validateEmailsTool.run(listOf('a@example.com', 'nope'), {}).summary).toBe(
      '1 of 2 look malformed',
    );
  });
});
