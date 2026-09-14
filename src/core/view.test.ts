import { describe, expect, it } from 'vitest';
import { faceted, searched, visibleRows } from './view';
import { cell, VALUE_COLUMN } from './model';
import { listOf, tableOf } from '../test/fixtures';

const PEOPLE = tableOf(
  ['name', 'city'],
  [
    { name: 'Anna', city: 'Göteborg' },
    { name: 'Bo', city: 'göteborg' },
    { name: 'Carl', city: '' },
    { name: 'Dora', city: 'Stockholm' },
  ],
);

function names(rows: { cells: Record<string, string> }[]): string[] {
  return rows.map((row) => row.cells['name'] ?? '');
}

describe('searched', () => {
  it('returns everything for an empty query', () => {
    expect(searched(PEOPLE, '   ')).toHaveLength(4);
  });

  it('matches anywhere in any column, ignoring case', () => {
    expect(names(searched(PEOPLE, 'göteborg'))).toEqual(['Anna', 'Bo']);
    expect(names(searched(PEOPLE, 'anna'))).toEqual(['Anna']);
  });

  it('returns nothing rather than everything when nothing matches', () => {
    expect(searched(PEOPLE, 'zzz')).toEqual([]);
  });
});

describe('faceted', () => {
  it('shows only the rows whose column holds that value', () => {
    expect(names(faceted(PEOPLE.rows, { columnId: 'city', value: 'Stockholm' }))).toEqual([
      'Dora',
    ]);
  });

  it('groups the spellings the profile grouped', () => {
    expect(names(faceted(PEOPLE.rows, { columnId: 'city', value: 'Göteborg' }))).toEqual([
      'Anna',
      'Bo',
    ]);
  });

  it('shows the empty cells when the value is empty', () => {
    expect(names(faceted(PEOPLE.rows, { columnId: 'city', value: '' }))).toEqual(['Carl']);
  });

  it('shows everything again when there is no filter', () => {
    expect(faceted(PEOPLE.rows, null)).toHaveLength(4);
  });

  it('shows nothing for a column that is no longer there', () => {
    expect(faceted(PEOPLE.rows, { columnId: 'gone', value: 'x' })).toEqual([]);
  });
});

describe('visibleRows', () => {
  it('narrows by the search and the picked value together', () => {
    expect(names(visibleRows(PEOPLE, '', { columnId: 'city', value: 'Göteborg' }))).toEqual([
      'Anna',
      'Bo',
    ]);
    expect(names(visibleRows(PEOPLE, 'anna', { columnId: 'city', value: 'Göteborg' }))).toEqual(
      ['Anna'],
    );
  });

  it('is the whole list when neither narrows it', () => {
    expect(visibleRows(PEOPLE, '', null)).toHaveLength(4);
  });

  it('works on a one-column list', () => {
    const rows = visibleRows(listOf('a', 'b', 'a'), '', {
      columnId: VALUE_COLUMN,
      value: 'a',
    });
    expect(rows.map((row) => cell(row, VALUE_COLUMN))).toEqual(['a', 'a']);
  });
});
