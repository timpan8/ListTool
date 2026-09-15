import { describe, expect, it } from 'vitest';
import { parseNumber } from './number';

describe('parseNumber', () => {
  it('reads plain numbers, signs included', () => {
    expect(parseNumber('42')).toBe(42);
    expect(parseNumber('-12')).toBe(-12);
    expect(parseNumber('+7')).toBe(7);
    expect(parseNumber('−3')).toBe(-3);
    expect(parseNumber('1234.5')).toBe(1234.5);
    expect(parseNumber('.5')).toBe(0.5);
  });

  it('reads the Swedish shape: spaces for thousands, a comma for decimals', () => {
    expect(parseNumber('1 234,50')).toBe(1234.5);
    expect(parseNumber('1 234,50')).toBe(1234.5);
    expect(parseNumber('12,5')).toBe(12.5);
    expect(parseNumber('1 234')).toBe(1234);
  });

  it('reads the English shape when both marks are there, whichever comes last', () => {
    expect(parseNumber('1,234.50')).toBe(1234.5);
    expect(parseNumber('1.234,50')).toBe(1234.5);
    expect(parseNumber('1,234,567.89')).toBe(1234567.89);
  });

  it('reads repeated separators as thousands groups, and only as groups of three', () => {
    expect(parseNumber('1,234,567')).toBe(1234567);
    expect(parseNumber('1.234.567')).toBe(1234567);
    expect(parseNumber('1.2.3')).toBeNull();
    expect(parseNumber('1,23,456')).toBeNull();
  });

  it('ignores a unit after a space, a percent sign and a currency symbol', () => {
    expect(parseNumber('1 234 kr')).toBe(1234);
    expect(parseNumber('45 %')).toBe(45);
    expect(parseNumber('45%')).toBe(45);
    expect(parseNumber('12 SEK')).toBe(12);
    expect(parseNumber('$100')).toBe(100);
    expect(parseNumber('99 €')).toBe(99);
  });

  it('is null for anything that is not a number', () => {
    for (const text of ['', '   ', 'abc', '12abc', '070-123 45 67', '2026-09-15', '1e3x', '-', ',']) {
      expect(parseNumber(text), text).toBeNull();
    }
  });
});
