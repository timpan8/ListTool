import { describe, expect, it } from 'vitest';
import { delimitedParser } from './delimited';
import { cell, VALUE_COLUMN } from '../core/model';
import { COMMA_LINE, EMPTY_ENTRIES, TAB_TABLE, THREE_LINES } from '../test/fixtures';

function values(input: string, options: Record<string, unknown> = {}): string[] {
  return delimitedParser.parse(input, options).rows.map((row) => cell(row, VALUE_COLUMN));
}

describe('delimited parser, rows', () => {
  it('splits a single comma line into rows', () => {
    expect(values(COMMA_LINE)).toEqual(['data1', 'data2', 'data3']);
  });

  it('trims items and drops empties by default', () => {
    expect(values(EMPTY_ENTRIES)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('keeps empty items when dropping is off', () => {
    expect(values('a,,b', { delimiter: ',', dropEmpty: false })).toEqual(['a', '', 'b']);
  });

  it('keeps surrounding whitespace when trimming is off', () => {
    expect(values('a , b', { delimiter: ',', trim: false, dropEmpty: false })).toEqual([
      'a ',
      ' b',
    ]);
  });

  it('splits every line of multi-line input', () => {
    expect(values('a;b\nc;d', { delimiter: ';' })).toEqual(['a', 'b', 'c', 'd']);
  });

  it('handles a trailing delimiter and CRLF together', () => {
    expect(values('a;b;\r\nc;\r\n', { delimiter: ';' })).toEqual(['a', 'b', 'c']);
  });

  it('treats a newline delimiter as one item per line', () => {
    expect(values(THREE_LINES, { delimiter: '\n' })).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('splits on tab', () => {
    expect(values('a\tb\tc', { delimiter: '\t' })).toEqual(['a', 'b', 'c']);
  });

  it('is empty for empty input', () => {
    expect(values('')).toEqual([]);
  });

  it('keeps the original input and options for re-parsing', () => {
    const dataset = delimitedParser.parse(COMMA_LINE, { delimiter: ',' });
    expect(dataset.rawInput).toBe(COMMA_LINE);
    expect(dataset.parse).toEqual({ parserId: 'delimited', options: { delimiter: ',' } });
  });
});

describe('delimited parser, columns', () => {
  const options = { delimiter: '\t', splitIntoColumns: true };

  it('makes one row per line with numbered columns', () => {
    const dataset = delimitedParser.parse(TAB_TABLE, options);
    expect(dataset.columns.map((column) => column.id)).toEqual(['c1', 'c2', 'c3']);
    expect(dataset.columns.map((column) => column.name)).toEqual([
      'Column 1',
      'Column 2',
      'Column 3',
    ]);
    expect(dataset.rows).toHaveLength(3);
  });

  it('does not treat the first line as a header', () => {
    const dataset = delimitedParser.parse(TAB_TABLE, options);
    expect(cell(dataset.rows[0]!, 'c1')).toBe('first');
  });

  it('pads short rows with empty cells rather than leaving them missing', () => {
    const dataset = delimitedParser.parse('a,b,c\nd,e', {
      delimiter: ',',
      splitIntoColumns: true,
    });
    expect(dataset.columns).toHaveLength(3);
    expect(cell(dataset.rows[1]!, 'c3')).toBe('');
  });

  it('drops a row whose cells are all empty', () => {
    const dataset = delimitedParser.parse('a,b\n,\nc,d', {
      delimiter: ',',
      splitIntoColumns: true,
    });
    expect(dataset.rows).toHaveLength(2);
  });

  it('keeps an all-empty row when dropping is off', () => {
    const dataset = delimitedParser.parse('a,b\n,', {
      delimiter: ',',
      splitIntoColumns: true,
      dropEmpty: false,
    });
    expect(dataset.rows).toHaveLength(2);
  });
});

describe('delimited detection', () => {
  it('claims a single delimited line', () => {
    expect(delimitedParser.detect(COMMA_LINE)).toEqual({
      confidence: 0.7,
      options: { delimiter: ',', splitIntoColumns: false },
    });
  });

  it('declines input with no consistent delimiter', () => {
    expect(delimitedParser.detect(THREE_LINES)).toBeNull();
  });

  it('suggests the delimiter it actually found', () => {
    expect(delimitedParser.detect('a;b;c')?.options).toEqual({
      delimiter: ';',
      splitIntoColumns: false,
    });
  });
});
