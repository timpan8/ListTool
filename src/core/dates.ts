/**
 * Dates as people write them, read into one shape. Only whole dates with a four-digit
 * year: a two-digit year is a guess, and a guess is not a normalisation.
 */
export interface DateParts {
  y: number;
  m: number;
  d: number;
}

/** What 05/09/2026 means: 5 September (day first, the Swedish and European reading) or 9 May. */
export type DayFirst = 'dmy' | 'mdy';

export type DateShape = 'iso' | 'dmy' | 'mdy' | 'compact';

/** Month names and their usual abbreviations, Swedish and English, lower-cased. */
const MONTHS = new Map<string, number>(
  Object.entries({
    jan: 1, januari: 1, january: 1,
    feb: 2, februari: 2, february: 2,
    mar: 3, mars: 3, march: 3,
    apr: 4, april: 4,
    maj: 5, may: 5,
    jun: 6, juni: 6, june: 6,
    jul: 7, juli: 7, july: 7,
    aug: 8, augusti: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    okt: 10, oct: 10, oktober: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  }),
);

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** A real calendar date: a month that exists, a day the month has, leap days included. */
export function isValidDate(parts: DateParts): boolean {
  return (
    Number.isInteger(parts.y) &&
    parts.y >= 1 &&
    parts.y <= 9999 &&
    parts.m >= 1 &&
    parts.m <= 12 &&
    parts.d >= 1 &&
    parts.d <= daysInMonth(parts.y, parts.m)
  );
}

function valid(parts: DateParts): DateParts | null {
  return isValidDate(parts) ? parts : null;
}

function monthNamed(name: string): number | undefined {
  return MONTHS.get(name.toLowerCase().replace(/\.$/, ''));
}

/**
 * Read a date in any of the shapes a list is likely to hold: 2026-09-15 (with or without
 * a time after it), 2026/09/15, 20260915, 15/09/2026, 15.9.2026, 15 sep 2026,
 * 15 september 2026, Sep 15, 2026. Null for anything else, and for a date that does
 * not exist.
 */
export function parseDate(value: string, dayFirst: DayFirst = 'dmy'): DateParts | null {
  const text = value.trim();
  let match: RegExpExecArray | null;

  match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ]\d{1,2}:\d{2}.*)?$/.exec(text);
  if (match !== null) {
    return valid({ y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) });
  }

  match = /^(\d{4})(\d{2})(\d{2})$/.exec(text);
  if (match !== null) {
    return valid({ y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) });
  }

  match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(text);
  if (match !== null) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const y = Number(match[3]);
    return valid(dayFirst === 'dmy' ? { y, m: second, d: first } : { y, m: first, d: second });
  }

  match = /^(\d{1,2})\.?\s+([\p{L}]+\.?)\s+(\d{4})$/u.exec(text);
  if (match !== null) {
    const m = monthNamed(match[2] as string);
    return m === undefined ? null : valid({ y: Number(match[3]), m, d: Number(match[1]) });
  }

  match = /^([\p{L}]+\.?)\s+(\d{1,2}),?\s+(\d{4})$/u.exec(text);
  if (match !== null) {
    const m = monthNamed(match[1] as string);
    return m === undefined ? null : valid({ y: Number(match[3]), m, d: Number(match[2]) });
  }

  return null;
}

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

/** Write a date in one shape: 2026-09-15, 15/09/2026, 09/15/2026 or 20260915. */
export function formatDate(parts: DateParts, shape: DateShape): string {
  const y = pad(parts.y, 4);
  const m = pad(parts.m, 2);
  const d = pad(parts.d, 2);
  switch (shape) {
    case 'dmy':
      return `${d}/${m}/${y}`;
    case 'mdy':
      return `${m}/${d}/${y}`;
    case 'compact':
      return `${y}${m}${d}`;
    default:
      return `${y}-${m}-${d}`;
  }
}

/** Which of the readable shapes a value is written in, or null when it is no date. */
export function dateShapeOf(value: string, dayFirst: DayFirst = 'dmy'): string | null {
  const text = value.trim();
  if (parseDate(text, dayFirst) === null) return null;
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(text)) return 'iso';
  if (/^\d{4}[/.]/.test(text)) return 'ymd';
  if (/^\d{8}$/.test(text)) return 'compact';
  if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/.test(text)) return dayFirst;
  return 'named';
}
