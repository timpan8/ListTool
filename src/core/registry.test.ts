import { describe, expect, it } from 'vitest';
import {
  booleanOption,
  carryOptions,
  defaultOptions,
  numberOption,
  stringOption,
  stringsOption,
  type OptionField,
} from './registry';

const fields: OptionField[] = [
  { key: 'delimiter', label: 'Delimiter', type: 'delimiter', default: ',' },
  { key: 'trim', label: 'Trim', type: 'boolean', default: true },
  { key: 'limit', label: 'Limit', type: 'number', default: 5 },
  { key: 'prefix', label: 'Prefix', type: 'text', default: '' },
  {
    key: 'mode',
    label: 'Mode',
    type: 'select',
    default: 'upper',
    choices: [{ value: 'upper', label: 'UPPER' }],
  },
];

describe('defaultOptions', () => {
  it('collects every field default', () => {
    expect(defaultOptions(fields)).toEqual({
      delimiter: ',',
      trim: true,
      limit: 5,
      prefix: '',
      mode: 'upper',
    });
  });

  it('omits a column field with no default, so the shell can pick one from the dataset', () => {
    const options = defaultOptions([{ key: 'column', label: 'Column', type: 'column' }]);
    expect('column' in options).toBe(false);
  });

  it('keeps an explicit column default', () => {
    expect(
      defaultOptions([{ key: 'column', label: 'Column', type: 'column', default: 'email' }]),
    ).toEqual({ column: 'email' });
  });

  it('is empty for a tool with no options', () => {
    expect(defaultOptions([])).toEqual({});
  });
});

describe('option readers', () => {
  it('read the value when the type matches', () => {
    expect(stringOption({ a: 'x' }, 'a', 'fallback')).toBe('x');
    expect(booleanOption({ a: false }, 'a', true)).toBe(false);
    expect(numberOption({ a: 7 }, 'a', 1)).toBe(7);
  });

  it('fall back when the key is missing', () => {
    expect(stringOption({}, 'a', 'fallback')).toBe('fallback');
    expect(booleanOption({}, 'a', true)).toBe(true);
    expect(numberOption({}, 'a', 1)).toBe(1);
  });

  it('fall back when a serialized recipe carries the wrong type', () => {
    expect(stringOption({ a: 42 }, 'a', 'fallback')).toBe('fallback');
    expect(booleanOption({ a: 'yes' }, 'a', false)).toBe(false);
    expect(numberOption({ a: {} }, 'a', 1)).toBe(1);
  });

  it('accept a numeric string, because number inputs report strings', () => {
    expect(numberOption({ a: '12' }, 'a', 1)).toBe(12);
    expect(numberOption({ a: '' }, 'a', 1)).toBe(1);
    expect(numberOption({ a: 'twelve' }, 'a', 1)).toBe(1);
  });

  it('rejects non-finite numbers', () => {
    expect(numberOption({ a: Number.NaN }, 'a', 1)).toBe(1);
    expect(numberOption({ a: Number.POSITIVE_INFINITY }, 'a', 1)).toBe(1);
  });

  it('keeps an empty string as a real value', () => {
    expect(stringOption({ a: '' }, 'a', 'fallback')).toBe('');
  });
});

describe('the columns field', () => {
  const field: OptionField = { key: 'columns', label: 'Columns', type: 'columns' };

  it('stays unset with no default, so a consumer can mean "every column"', () => {
    expect('columns' in defaultOptions([field])).toBe(false);
  });

  it('keeps an explicit default', () => {
    expect(defaultOptions([{ ...field, default: ['a', 'b'] }])).toEqual({ columns: ['a', 'b'] });
  });
});

describe('stringsOption', () => {
  it('reads an array of strings', () => {
    expect(stringsOption({ a: ['x', 'y'] }, 'a', ['fallback'])).toEqual(['x', 'y']);
  });

  it('reads an empty array as an empty array', () => {
    expect(stringsOption({ a: [] }, 'a', ['fallback'])).toEqual([]);
  });

  it('falls back when the key is missing', () => {
    expect(stringsOption({}, 'a', ['fallback'])).toEqual(['fallback']);
  });

  it('falls back when a serialized recipe carries something else', () => {
    expect(stringsOption({ a: 'x' }, 'a', ['fallback'])).toEqual(['fallback']);
    expect(stringsOption({ a: ['x', 7] }, 'a', ['fallback'])).toEqual(['fallback']);
  });
});

describe('carryOptions', () => {
  const csv: OptionField[] = [
    { key: 'columns', label: 'Columns', type: 'columns' },
    { key: 'header', label: 'Header', type: 'boolean', default: true },
  ];
  const markdown: OptionField[] = [
    { key: 'columns', label: 'Columns', type: 'columns' },
    { key: 'header', label: 'Header', type: 'boolean', default: true },
    { key: 'flavour', label: 'Markup', type: 'select', default: 'markdown', choices: [] },
  ];
  const lines: OptionField[] = [{ key: 'column', label: 'Column', type: 'column' }];

  const chosen = { columns: ['c2'], header: false, flavour: 'html' };

  it('carries a value the new field list declares the same way', () => {
    expect(carryOptions(markdown, csv, chosen)).toEqual({ columns: ['c2'], header: false });
  });

  it('drops a value the new field list has no field for', () => {
    expect(carryOptions(lines, csv, chosen)).toEqual({});
  });

  it('never carries a select, whose choices belong to the field that declared them', () => {
    expect('flavour' in carryOptions(markdown, markdown, chosen)).toBe(false);
  });

  it('drops a key whose type changed between the two', () => {
    const retyped: OptionField[] = [{ key: 'columns', label: 'Column', type: 'column' }];
    expect(carryOptions(retyped, csv, chosen)).toEqual({});
  });

  it('carries nothing when nothing was set', () => {
    expect(carryOptions(markdown, csv, {})).toEqual({});
  });
});
