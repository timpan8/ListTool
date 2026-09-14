import { describe, expect, it } from 'vitest';
import { parsers, parserById } from './index';
import { bestParser } from '../core/detect';
import { defaultOptions } from '../core/registry';
import { cell, VALUE_COLUMN } from '../core/model';
import {
  COMMA_LINE,
  CSV_WITH_HEADER,
  TAB_TABLE,
  THREE_LINES,
} from '../test/fixtures';

describe('parser registry', () => {
  it('has unique ids', () => {
    const ids = parsers.map((parser) => parser.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('looks parsers up by id', () => {
    expect(parserById('lines')?.name).toBe('Lines');
    expect(parserById('nope')).toBeUndefined();
  });

  it('gives every parser a name, a description and usable option defaults', () => {
    for (const parser of parsers) {
      expect(parser.name.trim()).not.toBe('');
      expect(parser.description.trim()).not.toBe('');
      for (const field of parser.options) {
        expect(field.label.trim()).not.toBe('');
      }
      expect(() => parser.parse('a,b\nc,d', defaultOptions(parser.options))).not.toThrow();
    }
  });
});

describe('detection across the registry', () => {
  it('sends a comma line to Delimited and splits it into three rows', () => {
    const detected = bestParser(parsers, COMMA_LINE);
    expect(detected?.parser.id).toBe('delimited');

    const dataset = detected!.parser.parse(COMMA_LINE, detected!.options);
    expect(dataset.rows.map((row) => cell(row, VALUE_COLUMN))).toEqual([
      'data1',
      'data2',
      'data3',
    ]);
  });

  it('sends plain lines to Lines, one row each', () => {
    const detected = bestParser(parsers, THREE_LINES);
    expect(detected?.parser.id).toBe('lines');
    expect(detected!.parser.parse(THREE_LINES, detected!.options).rows).toHaveLength(3);
  });

  it('sends a CSV with a header to CSV and names the columns from it', () => {
    const detected = bestParser(parsers, CSV_WITH_HEADER);
    expect(detected?.parser.id).toBe('csv');

    const dataset = detected!.parser.parse(CSV_WITH_HEADER, detected!.options);
    expect(dataset.columns.map((column) => column.name)).toEqual(['name', 'email']);
  });

  it('sends a tab-separated table to CSV', () => {
    expect(bestParser(parsers, TAB_TABLE)?.parser.id).toBe('csv');
  });

  it('suggests nothing for empty input', () => {
    expect(bestParser(parsers, '')).toBeNull();
  });
});
