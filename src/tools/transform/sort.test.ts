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

describe('sorting on several keys', () => {
  const PEOPLE = tableOf(
    ['last', 'first'],
    [
      { last: 'Berg', first: 'Bo' },
      { last: 'Andersson', first: 'Carl' },
      { last: 'Berg', first: 'Anna' },
      { last: 'Andersson', first: 'Anna' },
    ],
  );

  function names(options: Record<string, unknown>): string[] {
    return sortTool
      .run(PEOPLE, { by: 'value', locale: 'sv', numeric: true, ...options })
      .output.rows.map((row) => `${cell(row, 'last')} ${cell(row, 'first')}`);
  }

  it('lets the second key decide a tie on the first', () => {
    expect(names({ column: 'last', direction: 'asc', then: 'first', thenDirection: 'asc' })).toEqual([
      'Andersson Anna',
      'Andersson Carl',
      'Berg Anna',
      'Berg Bo',
    ]);
  });

  it('sorts each key in its own direction', () => {
    expect(names({ column: 'last', direction: 'asc', then: 'first', thenDirection: 'desc' })).toEqual([
      'Andersson Carl',
      'Andersson Anna',
      'Berg Bo',
      'Berg Anna',
    ]);
  });

  it('leaves a tie in the original order when no further key decides it', () => {
    expect(names({ column: 'last', direction: 'asc' })).toEqual([
      'Andersson Carl',
      'Andersson Anna',
      'Berg Bo',
      'Berg Anna',
    ]);
  });

  it('ignores a level set to None', () => {
    const result = sortTool.run(PEOPLE, { column: 'last', then: '', then2: '' });
    expect(result.stats).toEqual({ rows: 4, keys: 1 });
  });

  it('ignores a level that names a column already used', () => {
    const result = sortTool.run(PEOPLE, { column: 'last', then: 'last' });
    expect(result.stats?.['keys']).toBe(1);
  });

  it('says which keys it sorted on, and in which direction', () => {
    const result = sortTool.run(PEOPLE, {
      column: 'last',
      direction: 'asc',
      then: 'first',
      thenDirection: 'desc',
    });
    expect(result.summary).toBe('Sorted 4 rows by last (A – Z) · first (Z – A)');
  });

  it('still says the short thing for a single key', () => {
    expect(sortTool.run(PEOPLE, { column: 'last' }).summary).toBe(
      'Sorted 4 rows by last, A – Z',
    );
  });

  it('sorts on three keys', () => {
    const wide = tableOf(
      ['a', 'b', 'c'],
      [
        { a: '1', b: '1', c: '2' },
        { a: '1', b: '1', c: '1' },
      ],
    );
    const result = sortTool.run(wide, { column: 'a', then: 'b', then2: 'c' });
    expect(result.output.rows.map((row) => cell(row, 'c'))).toEqual(['1', '2']);
    expect(result.stats?.['keys']).toBe(3);
  });

  it('sorts by length on every key it was given', () => {
    const words = tableOf(
      ['a', 'b'],
      [
        { a: 'xx', b: 'zzz' },
        { a: 'xx', b: 'z' },
        { a: 'x', b: 'zz' },
      ],
    );
    const result = sortTool.run(words, { column: 'a', then: 'b', by: 'length' });
    expect(result.output.rows.map((row) => cell(row, 'b'))).toEqual(['zz', 'z', 'zzz']);
  });
});
