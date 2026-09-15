/**
 * A number as people write it, or null when the text is not one.
 *
 *   "1 234,50"  "1,234.50"  "1.234,50"  "1234.5"  "−12"  "45 %"  "1 234 kr"  "$100"
 *
 * Spaces of any width are thousands separators. With both a comma and a point, the last
 * one is the decimal mark. A lone comma is a decimal comma — the Swedish reading, and
 * the app's default — while several commas or points are thousands groups, which must
 * be groups of three so a version number like 1.2.3 is never read as 123. A unit after
 * a space ("kr", "SEK"), a percent sign or a currency symbol is ignored; anything else
 * that is not a digit makes the text not a number.
 */
export function parseNumber(value: string): number | null {
  const body = value
    .trim()
    .replace(/^[€$£]\s*/u, '')
    .replace(/(?:\s+[a-zA-Z]{1,4}|\s*[%€$£])$/u, '')
    .replace(/[\s  ]/gu, '');
  const match = /^([-+−])?(\d[\d.,]*|[.,]\d+)$/u.exec(body);
  if (match === null) return null;

  const sign = match[1] === '-' || match[1] === '−' ? -1 : 1;
  const digits = match[2] as string;
  const commas = digits.split(',').length - 1;
  const points = digits.split('.').length - 1;

  let normalized: string;
  if (commas > 0 && points > 0) {
    const commaLast = digits.lastIndexOf(',') > digits.lastIndexOf('.');
    normalized = commaLast
      ? digits.replace(/\./g, '').replace(',', '.')
      : digits.replace(/,/g, '');
  } else if (commas > 1 || points > 1) {
    if (!/^\d{1,3}(?:[.,]\d{3})+$/.test(digits)) return null;
    normalized = digits.replace(/[.,]/g, '');
  } else {
    normalized = digits.replace(',', '.');
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? sign * parsed : null;
}
