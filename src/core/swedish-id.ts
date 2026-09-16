import { isValidDate, type DateParts } from './dates';

/**
 * Swedish identity numbers: personnummer and samordningsnummer for people, and
 * organisationsnummer for companies and authorities. All three are ten digits with a
 * Luhn check digit last; the middle pair tells a person (a month, 01–12) from an
 * organisation (20 and up). A samordningsnummer adds 60 to the day.
 */
export type SwedishIdKind = 'personnummer' | 'samordningsnummer' | 'organisationsnummer';

export interface SwedishId {
  kind: SwedishIdKind;
  /** YYYYMMDD-XXXX for a person, NNNNNN-NNNN for an organisation. */
  normalized: string;
}

/** The Luhn check over a ten-digit number: doubled from the left, check digit last. */
export function luhnValid(digits: string): boolean {
  if (!/^\d{10}$/.test(digits)) return false;
  let sum = 0;
  for (let at = 0; at < 10; at += 1) {
    let n = Number(digits[at]);
    if (at % 2 === 0) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

const SHAPE = /^(\d{2})?(\d{2})(\d{2})(\d{2})([-+])?(\d{4})$/;

/** Today, in the calendar, for deciding a two-digit year's century. */
function todayParts(): DateParts {
  const now = new Date();
  return { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1, d: now.getUTCDate() };
}

/**
 * Read a Swedish identity number in any of its written forms — YYMMDD-XXXX,
 * YYMMDD+XXXX (a hundred or more years old), YYMMDDXXXX, YYYYMMDD-XXXX, YYYYMMDDXXXX,
 * NNNNNN-NNNN — or null when it is not one: the wrong shape, a date that does not exist,
 * or a check digit that does not add up. The value itself is never changed.
 */
export function readSwedishId(value: string, today: DateParts = todayParts()): SwedishId | null {
  const compact = value.trim().replace(/\s+/g, '');
  const match = SHAPE.exec(compact);
  if (match === null) return null;
  const [, century, yy, mm, dd, separator, last] = match as unknown as [
    string,
    string | undefined,
    string,
    string,
    string,
    string | undefined,
    string,
  ];
  const digits = `${yy}${mm}${dd}${last}`;
  if (!luhnValid(digits)) return null;

  const month = Number(mm);
  if (month >= 20) {
    // An organisation. A twelve-digit form carries the 16 prefix and nothing else.
    if (century !== undefined && century !== '16') return null;
    return { kind: 'organisationsnummer', normalized: `${yy}${mm}${dd}-${last}` };
  }

  const day = Number(dd);
  const coordination = day > 60;
  const realDay = coordination ? day - 60 : day;

  let year: number;
  if (century !== undefined) {
    year = Number(century) * 100 + Number(yy);
  } else {
    // The most recent year ending in yy whose date is not in the future; a plus sign
    // says the person is a hundred or more, so one century further back.
    year = today.y - (today.y % 100) + Number(yy);
    const future =
      year > today.y ||
      (year === today.y && (month > today.m || (month === today.m && realDay > today.d)));
    if (future) year -= 100;
    if (separator === '+') year -= 100;
  }

  if (!isValidDate({ y: year, m: month, d: realDay })) return null;
  return {
    kind: coordination ? 'samordningsnummer' : 'personnummer',
    normalized: `${String(year).padStart(4, '0')}${mm}${dd}-${last}`,
  };
}

/** True when the text has the shape of an identity number, whether or not it checks out. */
export function looksLikeSwedishId(value: string): boolean {
  return SHAPE.test(value.trim().replace(/\s+/g, ''));
}
