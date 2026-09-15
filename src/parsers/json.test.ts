import { describe, expect, it } from 'vitest';
import { jsonParser } from './json';
import { cell, VALUE_COLUMN } from '../core/model';

const PEOPLE = JSON.stringify([
  { first: 'Anna', email: 'anna@example.com' },
  { first: 'Åsa', email: 'asa@example.com' },
]);

describe('json parser', () => {
  it('reads an array of objects into columns named by the keys', () => {
    const dataset = jsonParser.parse(PEOPLE, {});

    expect(dataset.columns.map((column) => column.name)).toEqual(['first', 'email']);
    expect(dataset.rows.map((row) => cell(row, 'first'))).toEqual(['Anna', 'Åsa']);
  });

  it('gives a key only some objects carry a column of its own', () => {
    const mixed = '[{"a":1},{"a":2,"b":3}]';
    const dataset = jsonParser.parse(mixed, {});

    expect(dataset.columns.map((column) => column.id)).toEqual(['a', 'b']);
    expect([cell(dataset.rows[0]!, 'b'), cell(dataset.rows[1]!, 'b')]).toEqual(['', '3']);
  });

  it('writes numbers, booleans and null as text a person would recognise', () => {
    const dataset = jsonParser.parse('[{"n":1.5,"yes":true,"nothing":null}]', {});
    const row = dataset.rows[0]!;
    expect([cell(row, 'n'), cell(row, 'yes'), cell(row, 'nothing')]).toEqual([
      '1.5',
      'true',
      '',
    ]);
  });

  it('writes a nested value as JSON rather than as an object', () => {
    const dataset = jsonParser.parse('[{"tags":["a","b"]}]', {});
    expect(cell(dataset.rows[0]!, 'tags')).toBe('["a","b"]');
  });

  it('reads an array of arrays as a numbered table', () => {
    const dataset = jsonParser.parse('[["a","b"],["c"]]', {});

    expect(dataset.columns.map((column) => column.name)).toEqual(['Column 1', 'Column 2']);
    expect(cell(dataset.rows[1]!, 'c2')).toBe('');
  });

  it('reads an array of plain values as a plain list', () => {
    const dataset = jsonParser.parse('["a","b"]', {});

    expect(dataset.columns).toHaveLength(1);
    expect(dataset.rows.map((row) => cell(row, VALUE_COLUMN))).toEqual(['a', 'b']);
  });

  it('keeps the original text so the list can be re-parsed', () => {
    expect(jsonParser.parse(PEOPLE, {}).rawInput).toBe(PEOPLE);
    expect(jsonParser.parse(PEOPLE, {}).parse?.parserId).toBe('json');
  });

  it('produces an empty list from an empty array', () => {
    expect(jsonParser.parse('[]', {}).rows).toEqual([]);
  });

  it('produces an empty list rather than throwing on broken JSON', () => {
    expect(jsonParser.parse('[not json', {}).rows).toEqual([]);
  });

  it('handles Swedish characters and escaped quotes', () => {
    const dataset = jsonParser.parse('[{"v":"\\"Öberg, Åsa\\""}]', {});
    expect(cell(dataset.rows[0]!, 'v')).toBe('"Öberg, Åsa"');
  });
});

describe('json detection', () => {
  it('claims an array that actually parses', () => {
    expect(jsonParser.detect(PEOPLE)?.confidence).toBeGreaterThan(0.9);
    expect(jsonParser.detect('  ["a"]  ')).not.toBeNull();
  });

  it('claims nothing else, so ordinary text still reaches the other parsers', () => {
    expect(jsonParser.detect('a,b,c')).toBeNull();
    expect(jsonParser.detect('{"a":1}')).toBeNull();
    expect(jsonParser.detect('[broken')).toBeNull();
    expect(jsonParser.detect('')).toBeNull();
  });
});
