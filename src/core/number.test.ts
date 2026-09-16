import { describe, expect, it } from 'vitest';
import { formatNumber, parseNumber } from './number';

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

describe('formatNumber', () => {
  it('writes the Swedish shape and the English shape', () => {
    expect(formatNumber(1234.5, { decimal: ',', thousands: ' ' })).toBe('1 234,5');
    expect(formatNumber(1234.5, { decimal: '.', thousands: ',' })).toBe('1,234.5');
    expect(formatNumber(1234567, { decimal: ',', thousands: '.' })).toBe('1.234.567');
    expect(formatNumber(999, { decimal: ',', thousands: ' ' })).toBe('999');
  });

  it('fixes the decimals when asked', () => {
    expect(formatNumber(1234.5, { decimal: ',', thousands: ' ', decimals: 2 })).toBe('1 234,50');
    expect(formatNumber(1234.567, { decimal: '.', thousands: '', decimals: 1 })).toBe('1234.6');
    expect(formatNumber(12, { decimal: '.', thousands: '', decimals: 0 })).toBe('12');
  });

  it('keeps the sign, and never prints a negative zero', () => {
    expect(formatNumber(-1234.5, { decimal: ',', thousands: ' ' })).toBe('-1 234,5');
    expect(formatNumber(-0.001, { decimal: '.', thousands: '', decimals: 2 })).toBe('0.00');
  });

  it('never uses the decimal mark as the thousands mark', () => {
    expect(formatNumber(1234, { decimal: ',', thousands: ',' })).toBe('1234');
  });

  it('writes back what it read', () => {
    for (const text of ['1 234,5', '-12', '0,5', '1 000 000']) {
      const value = parseNumber(text) as number;
      expect(formatNumber(value, { decimal: ',', thousands: ' ' })).toBe(text.replace(/ /g, ' '));
    }
  });
});
