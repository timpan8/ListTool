import { describe, expect, it } from 'vitest';
import {
  bestParser,
  detectDelimiter,
  escapeDelimiter,
  nonEmptyLines,
  splitLines,
  unescapeDelimiter,
  withoutQuotedSpans,
} from './detect';
import type { Options, Parser } from './registry';
import { draftDataset } from './model';
import {
  COMMA_LINE,
  CRLF_TRAILING_SEMICOLON,
  CSV_CRLF,
  CSV_WITH_HEADER,
  TAB_TABLE,
  THREE_LINES,
} from '../test/fixtures';

describe('splitLines', () => {
  it('splits on LF, CRLF and bare CR alike', () => {
    expect(splitLines('a\nb\r\nc\rd')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps the empty string a trailing newline produces', () => {
    expect(splitLines('a\n')).toEqual(['a', '']);
    expect(nonEmptyLines('a\n')).toEqual(['a']);
  });

  it('treats a whitespace-only line as empty', () => {
    expect(nonEmptyLines('a\n   \nb')).toEqual(['a', 'b']);
  });
});

describe('detectDelimiter', () => {
  it('finds the comma in a single line of values', () => {
    expect(detectDelimiter(COMMA_LINE)).toEqual({ delimiter: ',', perLine: 2 });
  });

  it('reports nothing for plain lines with no delimiter', () => {
    expect(detectDelimiter(THREE_LINES)).toBeNull();
  });

  it('reports nothing for empty input', () => {
    expect(detectDelimiter('')).toBeNull();
    expect(detectDelimiter('   \n  ')).toBeNull();
  });

  it('prefers the tab in a tab-separated table over other candidates', () => {
    expect(detectDelimiter(TAB_TABLE)).toEqual({ delimiter: '\t', perLine: 2 });
  });

  it('ignores a candidate whose count varies between lines', () => {
    expect(detectDelimiter('a,b,c\nd,e')).toBeNull();
  });

  it('sees through CRLF line endings', () => {
    expect(detectDelimiter(CSV_CRLF)).toEqual({ delimiter: ',', perLine: 1 });
  });

  it('finds the semicolon in CRLF text that ends with a trailing separator', () => {
    expect(detectDelimiter(CRLF_TRAILING_SEMICOLON)).toEqual({ delimiter: ';', perLine: 1 });
  });

  it('picks the higher count when two candidates are both consistent', () => {
    expect(detectDelimiter('a,b,c;d')).toEqual({ delimiter: ',', perLine: 2 });
  });

  it('recognises runs of two or more spaces as a delimiter', () => {
    expect(detectDelimiter('a  b\nc  d')).toEqual({ delimiter: '  ', perLine: 1 });
  });

  it('does not count a comma inside a quoted field', () => {
    expect(detectDelimiter(CSV_WITH_HEADER)).toEqual({ delimiter: ',', perLine: 1 });
  });
});

describe('withoutQuotedSpans', () => {
  it('drops the contents of a quoted field', () => {
    expect(withoutQuotedSpans('"Andersson, Anna",anna@example.com')).toBe(
      ',anna@example.com',
    );
  });

  it('leaves unquoted text alone', () => {
    expect(withoutQuotedSpans('a,b,c')).toBe('a,b,c');
  });

  it('treats a doubled quote as an escaped quote, not the end of the field', () => {
    expect(withoutQuotedSpans('"say ""hi"", now",b')).toBe(',b');
  });

  it('tolerates an unterminated quote by dropping the rest of the line', () => {
    expect(withoutQuotedSpans('a,"b,c')).toBe('a,');
  });
});

function stubParser(id: string, confidence: number | null, options: Options = {}): Parser {
  return {
    id,
    name: id,
    description: id,
    options: [],
    detect: () => (confidence === null ? null : { confidence, options }),
    parse: () => draftDataset({ columns: [], rows: [] }),
  };
}

describe('bestParser', () => {
  it('takes the most confident answer', () => {
    const chosen = bestParser(
      [stubParser('low', 0.2), stubParser('high', 0.9), stubParser('mid', 0.5)],
      'anything',
    );
    expect(chosen?.parser.id).toBe('high');
  });

  it('carries the detected options along with the parser', () => {
    const chosen = bestParser([stubParser('delimited', 0.8, { delimiter: ';' })], 'a;b');
    expect(chosen?.options).toEqual({ delimiter: ';' });
  });

  it('skips parsers that decline or answer with zero confidence', () => {
    expect(bestParser([stubParser('none', null), stubParser('zero', 0)], 'x')).toBeNull();
  });

  it('is null when there are no parsers at all', () => {
    expect(bestParser([], 'x')).toBeNull();
  });

  it('keeps the first parser when confidences tie', () => {
    const chosen = bestParser([stubParser('first', 0.5), stubParser('second', 0.5)], 'x');
    expect(chosen?.parser.id).toBe('first');
  });
});

describe('delimiter escaping', () => {
  it('shows a tab as \\t and reads it back', () => {
    expect(escapeDelimiter('\t')).toBe('\\t');
    expect(unescapeDelimiter('\\t')).toBe('\t');
  });

  it('round-trips a newline', () => {
    expect(unescapeDelimiter(escapeDelimiter('\n'))).toBe('\n');
  });

  it('leaves an ordinary delimiter alone', () => {
    expect(escapeDelimiter(';')).toBe(';');
    expect(unescapeDelimiter(';')).toBe(';');
  });
});
