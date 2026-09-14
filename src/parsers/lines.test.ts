import { describe, expect, it } from 'vitest';
import { linesParser } from './lines';
import { cell, VALUE_COLUMN } from '../core/model';
import { COMMA_LINE, CRLF_TRAILING_SEMICOLON, THREE_LINES } from '../test/fixtures';

function values(input: string, options: Record<string, unknown> = {}): string[] {
  return linesParser.parse(input, options).rows.map((row) => cell(row, VALUE_COLUMN));
}

describe('lines parser', () => {
  it('makes one row per line', () => {
    expect(values(THREE_LINES)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('produces a single column called Value', () => {
    const dataset = linesParser.parse(THREE_LINES, {});
    expect(dataset.columns).toEqual([{ id: VALUE_COLUMN, name: 'Value' }]);
  });

  it('gives rows stable, position-based ids', () => {
    expect(linesParser.parse(THREE_LINES, {}).rows.map((row) => row.id)).toEqual([
      'r1',
      'r2',
      'r3',
    ]);
  });

  it('handles CRLF input', () => {
    expect(values('alpha\r\nbeta\r\n')).toEqual(['alpha', 'beta']);
  });

  it('trims and drops empties by default', () => {
    expect(values('  alpha  \n\n   \nbeta')).toEqual(['alpha', 'beta']);
  });

  it('keeps whitespace when trimming is off', () => {
    expect(values('  alpha  \nbeta', { trim: false, dropEmpty: true })).toEqual([
      '  alpha  ',
      'beta',
    ]);
  });

  it('keeps empty lines when dropping is off', () => {
    expect(values('alpha\n\nbeta', { trim: true, dropEmpty: false })).toEqual([
      'alpha',
      '',
      'beta',
    ]);
  });

  it('keeps an untrimmed whitespace-only line when dropping is off', () => {
    expect(values('alpha\n   ', { trim: false, dropEmpty: false })).toEqual(['alpha', '   ']);
  });

  it('is empty for empty input', () => {
    expect(values('')).toEqual([]);
  });

  it('keeps the original input for re-parsing', () => {
    const dataset = linesParser.parse(THREE_LINES, {});
    expect(dataset.rawInput).toBe(THREE_LINES);
    expect(dataset.parse).toEqual({ parserId: 'lines', options: {} });
  });

  it('never mutates the options it is given', () => {
    const options = { trim: false };
    linesParser.parse(THREE_LINES, options);
    expect(options).toEqual({ trim: false });
  });

  it('is deterministic', () => {
    expect(linesParser.parse(THREE_LINES, {})).toEqual(linesParser.parse(THREE_LINES, {}));
  });
});

describe('lines detection', () => {
  it('is confident about plain lines', () => {
    expect(linesParser.detect(THREE_LINES)?.confidence).toBe(0.6);
  });

  it('stands back when the input carries a delimiter', () => {
    expect(linesParser.detect(COMMA_LINE)?.confidence).toBe(0.2);
    expect(linesParser.detect(CRLF_TRAILING_SEMICOLON)?.confidence).toBe(0.2);
  });

  it('declines empty input', () => {
    expect(linesParser.detect('')).toBeNull();
    expect(linesParser.detect('  \n ')).toBeNull();
  });
});
