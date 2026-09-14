import { describe, expect, it } from 'vitest';
import { sortTool } from './sort';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

function values(input: string[], options = {}): string[] {
  return sortTool.run(listOf(...input), options).output.rows.map((row) =>
    cell(row, VALUE_COLUMN),
  );
}

describe('sort', () => {
  it('sorts A to Z by default', () => {
    expect(values(['c', 'a', 'b'])).toEqual(['a', 'b', 'c']);
  });

  it('sorts Z to A on request', () => {
    expect(values(['a', 'c', 'b'], { direction: 'desc' })).toEqual(['c', 'b', 'a']);
  });

  it('puts å ä ö after z with the Swedish default', () => {
    expect(values(['ö', 'z', 'ä', 'å', 'a'])).toEqual(['a', 'z', 'å', 'ä', 'ö']);
  });

  it('sorts å among the a-words in English', () => {
    expect(values(['z', 'å', 'a'], { locale: 'en' })).toEqual(['a', 'å', 'z']);
  });

  it('orders numbers naturally', () => {
    expect(values(['item10', 'item2'])).toEqual(['item2', 'item10']);
  });

  it('orders numbers as text when natural order is off', () => {
    expect(values(['item10', 'item2'], { numeric: false })).toEqual(['item10', 'item2']);
  });

  it('sorts by length when asked', () => {
    expect(values(['ccc', 'a', 'bb'], { by: 'length' })).toEqual(['a', 'bb', 'ccc']);
  });

  it('sorts on the chosen column and keeps the rows whole', () => {
    const table = tableOf(
      ['first', 'last'],
      [
        { first: 'Bo', last: 'Berg' },
        { first: 'Anna', last: 'Andersson' },
      ],
    );
    const output = sortTool.run(table, { column: 'last' }).output;
    expect(output.rows.map((row) => cell(row, 'first'))).toEqual(['Anna', 'Bo']);
  });

  it('reports the column and direction', () => {
    expect(sortTool.run(listOf('b', 'a'), {}).summary).toBe('Sorted 2 rows by Value, A – Z');
  });

  it('handles an empty list', () => {
    expect(values([])).toEqual([]);
  });
});
