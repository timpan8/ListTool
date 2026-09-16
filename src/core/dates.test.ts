import { describe, expect, it } from 'vitest';
import { dateShapeOf, daysInMonth, formatDate, isValidDate, parseDate } from './dates';

describe('parseDate', () => {
  it('reads ISO dates, with or without a time after them', () => {
    expect(parseDate('2026-09-15')).toEqual({ y: 2026, m: 9, d: 15 });
    expect(parseDate('2026-9-5')).toEqual({ y: 2026, m: 9, d: 5 });
    expect(parseDate('2026-01-05T10:00')).toEqual({ y: 2026, m: 1, d: 5 });
    expect(parseDate('2026-01-05 10:00:00')).toEqual({ y: 2026, m: 1, d: 5 });
    expect(parseDate('2026/09/15')).toEqual({ y: 2026, m: 9, d: 15 });
  });

  it('reads compact and day-first dates', () => {
    expect(parseDate('20260915')).toEqual({ y: 2026, m: 9, d: 15 });
    expect(parseDate('15/09/2026')).toEqual({ y: 2026, m: 9, d: 15 });
    expect(parseDate('15.9.2026')).toEqual({ y: 2026, m: 9, d: 15 });
    expect(parseDate('15-09-2026')).toEqual({ y: 2026, m: 9, d: 15 });
  });

  it('reads month first when told to', () => {
    expect(parseDate('09/15/2026', 'mdy')).toEqual({ y: 2026, m: 9, d: 15 });
    expect(parseDate('09/15/2026', 'dmy')).toBeNull();
  });

  it('reads month names in Swedish and English', () => {
    expect(parseDate('15 sep 2026')).toEqual({ y: 2026, m: 9, d: 15 });
    expect(parseDate('15 sept. 2026')).toEqual({ y: 2026, m: 9, d: 15 });
    expect(parseDate('5 maj 2026')).toEqual({ y: 2026, m: 5, d: 5 });
    expect(parseDate('15. september 2026')).toEqual({ y: 2026, m: 9, d: 15 });
    expect(parseDate('Sep 15, 2026')).toEqual({ y: 2026, m: 9, d: 15 });
    expect(parseDate('September 15 2026')).toEqual({ y: 2026, m: 9, d: 15 });
    expect(parseDate('15 okt 2026')).toEqual({ y: 2026, m: 10, d: 15 });
  });

  it('refuses dates that do not exist', () => {
    expect(parseDate('2026-02-29')).toBeNull();
    expect(parseDate('2024-02-29')).toEqual({ y: 2024, m: 2, d: 29 });
    expect(parseDate('2026-13-01')).toBeNull();
    expect(parseDate('31/04/2026')).toBeNull();
    expect(parseDate('2026-00-10')).toBeNull();
  });

  it('is null for anything that is not a whole date', () => {
    for (const text of ['', 'today', '15/09/26', '2026', '15 foo 2026', '1 234,50', '2026-09']) {
      expect(parseDate(text), text).toBeNull();
    }
  });
});

describe('formatDate', () => {
  const parts = { y: 2026, m: 9, d: 5 };

  it('writes each shape with padding', () => {
    expect(formatDate(parts, 'iso')).toBe('2026-09-05');
    expect(formatDate(parts, 'dmy')).toBe('05/09/2026');
    expect(formatDate(parts, 'mdy')).toBe('09/05/2026');
    expect(formatDate(parts, 'compact')).toBe('20260905');
  });
});

describe('dateShapeOf', () => {
  it('names the shape a date is written in', () => {
    expect(dateShapeOf('2026-09-15')).toBe('iso');
    expect(dateShapeOf('2026/09/15')).toBe('ymd');
    expect(dateShapeOf('20260915')).toBe('compact');
    expect(dateShapeOf('15/09/2026')).toBe('dmy');
    expect(dateShapeOf('15 sep 2026')).toBe('named');
    expect(dateShapeOf('nope')).toBeNull();
  });
});

describe('the calendar', () => {
  it('knows the months and the leap years', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(isValidDate({ y: 2026, m: 4, d: 31 })).toBe(false);
  });
});
