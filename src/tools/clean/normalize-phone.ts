import { dateShapeOf } from '../../core/dates';
import { cell } from '../../core/model';
import { booleanOption, stringOption, type Tool } from '../../core/registry';
import { readSwedishId } from '../../core/swedish-id';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { mapCells, targetColumn, withRows } from '../helpers';

const strings = en.tools.phone;

/** E.164 allows at most 15 digits; fewer than 6 is not a phone number anywhere. */
const MIN_DIGITS = 6;
const MAX_DIGITS = 15;

const DEFAULT_COUNTRY = '46';

/** Anything a person writes between the digits. A letter means it is not a number. */
const SEPARATORS = /[\s\-()./]/g;

/** The share of a column's filled cells that must be numbers before it is worth a look. */
const PHONE_SHARE = 0.6;

/** The digits of a number in international form, or null when it is not one. */
function toDigits(value: string, country: string): string | null {
  const stripped = value.trim().replace(SEPARATORS, '');
  if (stripped === '') return null;

  const international = stripped.startsWith('+')
    ? stripped.slice(1)
    : stripped.startsWith('00')
      ? stripped.slice(2)
      : null;

  const rest = international ?? stripped;
  if (!/^[0-9]+$/.test(rest)) return null;
  // Checked before the country code is prefixed, so a 5-digit shortcode stays rejected.
  if (rest.length < MIN_DIGITS) return null;

  const digits =
    international !== null
      ? international
      : // A national number: the trunk 0 stands for the country code, so it is replaced.
        country === ''
        ? rest
        : `${country}${rest.startsWith('0') ? rest.slice(1) : rest}`;

  if (digits.length > MAX_DIGITS) return null;
  return digits;
}

/** Groups of three, so a long run of digits can be read at all. */
function group(digits: string): string {
  return (digits.match(/.{1,3}/g) ?? []).join(' ');
}

function render(digits: string, shape: string, country: string): string {
  if (shape === 'digits') return digits;
  if (shape !== 'spaced') return `+${digits}`;
  return country !== '' && digits.startsWith(country)
    ? `+${country} ${group(digits.slice(country.length))}`
    : `+${group(digits)}`;
}

/** The way a number is written, digits aside: 070-123 45 67 and 070-123 45 68 share one. */
function shapeOf(value: string): string {
  return value.trim().replace(/[0-9]+/g, '9');
}

export const normalizePhoneTool: Tool = {
  id: 'normalize-phone',
  name: strings.name,
  category: 'clean',
  description: strings.description,
  keywords: ['phone', 'telephone', 'mobile', 'number', 'e164', 'format', 'msisdn'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column' },
    {
      key: 'country',
      label: strings.country,
      type: 'text',
      default: DEFAULT_COUNTRY,
      help: strings.countryHelp,
    },
    {
      key: 'shape',
      label: strings.shape,
      type: 'select',
      default: 'e164',
      choices: [
        { value: 'e164', label: strings.e164 },
        { value: 'spaced', label: strings.spaced },
        { value: 'digits', label: strings.digits },
      ],
    },
    { key: 'keepUnparsed', label: strings.keepUnparsed, type: 'boolean', default: true },
  ],
  run(input, options) {
    const column = targetColumn(input, options);
    if (column === undefined) return { output: input, summary: en.tools.nothingChanged };

    // A leading + on the country code is punctuation, not a digit.
    const country = stringOption(options, 'country', DEFAULT_COUNTRY).replace(/[^0-9]/g, '');
    const shape = stringOption(options, 'shape', 'e164');
    const keepUnparsed = booleanOption(options, 'keepUnparsed', true);

    let normalized = 0;
    let unparsed = 0;
    let total = 0;

    const { rows, changed } = mapCells(input, [column], (value) => {
      if (value.trim() === '') return value;
      total += 1;

      const digits = toDigits(value, country);
      if (digits === null) {
        unparsed += 1;
        return keepUnparsed ? value : '';
      }

      normalized += 1;
      return render(digits, shape, country);
    });

    if (changed === 0) {
      return { output: input, summary: en.tools.nothingChanged, stats: { normalized, unparsed } };
    }

    return {
      output: withRows(input, rows),
      summary: format(strings.summary, { count: normalized, total }),
      stats: { normalized, unparsed },
      ...(unparsed > 0 && keepUnparsed ? { warnings: [plural(unparsed, strings.warnUnparsed)] } : {}),
    };
  },
  check(input) {
    // A column of numbers written more than one way. Dates and identity numbers are
    // runs of digits too, so they are set aside before anything is counted — an identity
    // number only when it checks out, since a bare mobile number has the same ten digits.
    for (const column of input.columns) {
      let filled = 0;
      let numbers = 0;
      const shapes = new Set<string>();
      for (const row of input.rows) {
        const value = cell(row, column.id).trim();
        if (value === '') continue;
        filled += 1;
        if (dateShapeOf(value) !== null || readSwedishId(value) !== null) continue;
        if (toDigits(value, DEFAULT_COUNTRY) === null) continue;
        numbers += 1;
        shapes.add(shapeOf(value));
      }
      if (numbers === 0 || numbers / filled < PHONE_SHARE || shapes.size < 2) continue;
      return { summary: plural(numbers, strings.found), count: numbers, options: { column: column.id } };
    }
    return null;
  },
};
