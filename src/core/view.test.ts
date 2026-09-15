import { describe, expect, it } from 'vitest';
import {
  copyScope,
  EMPTY_VIEW,
  faceted,
  scopeRows,
  searched,
  sorted,
  visibleRows,
  withVisible,
  type ViewState,
} from './view';
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

  it('matches anywhere in the cell when the filter says contains', () => {
    expect(
      names(faceted(PEOPLE.rows, { columnId: 'city', value: 'borg', mode: 'contains' })),
    ).toEqual(['Anna', 'Bo']);
  });

  it('still means the empty cells when a contains filter is empty', () => {
    expect(names(faceted(PEOPLE.rows, { columnId: 'city', value: '', mode: 'contains' }))).toEqual(
      ['Carl'],
    );
  });
});

describe('sorted', () => {
  const CITIES = tableOf(
    ['name', 'city'],
    [
      { name: 'Anna', city: 'Uppsala' },
      { name: 'Bo', city: 'Ystad' },
      { name: 'Carl', city: 'Uppsala' },
      { name: 'Dora', city: '' },
    ],
  );

  it('orders by the column, ascending or descending, and leaves the input alone', () => {
    const before = [...CITIES.rows];
    expect(names(sorted(CITIES.rows, { columnId: 'city', direction: 'asc' }))).toEqual([
      'Dora',
      'Anna',
      'Carl',
      'Bo',
    ]);
    expect(names(sorted(CITIES.rows, { columnId: 'city', direction: 'desc' }))).toEqual([
      'Bo',
      'Anna',
      'Carl',
      'Dora',
    ]);
    expect(CITIES.rows).toEqual(before);
  });

  it('is stable in both directions: equal values keep the list order', () => {
    const asc = names(sorted(CITIES.rows, { columnId: 'city', direction: 'asc' }));
    const desc = names(sorted(CITIES.rows, { columnId: 'city', direction: 'desc' }));
    expect(asc.indexOf('Anna')).toBeLessThan(asc.indexOf('Carl'));
    expect(desc.indexOf('Anna')).toBeLessThan(desc.indexOf('Carl'));
  });

  it('sorts å, ä and ö after z the Swedish way, and digit runs as numbers', () => {
    const list = listOf('Örebro', 'Ystad', 'item10', 'item2');
    const rows = sorted(list.rows, { columnId: VALUE_COLUMN, direction: 'asc' });
    expect(rows.map((row) => cell(row, VALUE_COLUMN))).toEqual([
      'item2',
      'item10',
      'Ystad',
      'Örebro',
    ]);
  });

  it('is the list order when there is no sort', () => {
    expect(sorted(CITIES.rows, null)).toBe(CITIES.rows);
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

  it('orders what it shows when the view is sorted', () => {
    // "o" is in Bo, Dora and both spellings of Göteborg — the search reads every column.
    expect(names(visibleRows(PEOPLE, 'o', null, { columnId: 'name', direction: 'desc' }))).toEqual(
      ['Dora', 'Bo', 'Anna'],
    );
  });
});

describe('scopeRows', () => {
  const ids = (rows: { id: string }[]) => rows.map((row) => row.id);
  const [anna, bo, carl, dora] = PEOPLE.rows.map((row) => row.id) as [string, string, string, string];

  it('takes what is shown: the search, the filter and the order together', () => {
    const view: ViewState = {
      ...EMPTY_VIEW,
      query: 'o',
      filter: { columnId: 'city', value: 'Göteborg' },
      sort: { columnId: 'name', direction: 'desc' },
    };
    expect(ids(scopeRows(PEOPLE, 'shown', view))).toEqual([bo, anna]);
  });

  it('takes the ticked rows in list order, even the ones the search hides', () => {
    const view: ViewState = { ...EMPTY_VIEW, query: 'anna', ticked: [dora, bo] };
    expect(ids(scopeRows(PEOPLE, 'ticked', view))).toEqual([bo, dora]);
  });

  it('shows the ticked rows in the view order when there is one', () => {
    const view: ViewState = {
      ...EMPTY_VIEW,
      ticked: [anna, dora, bo],
      sort: { columnId: 'name', direction: 'desc' },
    };
    expect(ids(scopeRows(PEOPLE, 'ticked', view))).toEqual([dora, bo, anna]);
  });

  it('takes the whole list, in its own order, whatever the view does', () => {
    const view: ViewState = {
      query: 'zzz',
      filter: { columnId: 'city', value: 'Stockholm' },
      sort: { columnId: 'name', direction: 'desc' },
      ticked: [carl],
    };
    expect(scopeRows(PEOPLE, 'all', view)).toBe(PEOPLE.rows);
  });
});

describe('copyScope', () => {
  it('is the ticked rows when any are ticked, else what is shown', () => {
    expect(copyScope({ ...EMPTY_VIEW, ticked: ['r1'] })).toBe('ticked');
    expect(copyScope({ ...EMPTY_VIEW, query: 'x' })).toBe('shown');
    expect(copyScope(EMPTY_VIEW)).toBe('shown');
  });
});

describe('withVisible', () => {
  it('keeps everything about the dataset but the rows', () => {
    const narrowed = withVisible(PEOPLE, PEOPLE.rows.slice(0, 1));
    expect(narrowed.columns).toBe(PEOPLE.columns);
    expect(narrowed.name).toBe(PEOPLE.name);
    expect(narrowed.rows).toHaveLength(1);
    expect(PEOPLE.rows).toHaveLength(4);
  });
});
