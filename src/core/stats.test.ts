import { describe, expect, it } from 'vitest';
import { datasetStats } from './stats';
import { draftDataset, makeRow, valuesDataset, VALUE_COLUMN } from './model';

const parseRef = { parserId: 'lines', options: {} };

function list(...values: string[]) {
  return valuesDataset(values, 'Value', values.join('\n'), parseRef);
}

describe('datasetStats', () => {
  it('counts an all-unique list', () => {
    expect(datasetStats(list('a', 'b', 'c'))).toEqual({
      rows: 3,
      unique: 3,
      blank: 0,
      duplicates: 0,
    });
  });

  it('counts duplicates as rows minus unique', () => {
    expect(datasetStats(list('a', 'b', 'a', 'a'))).toEqual({
      rows: 4,
      unique: 2,
      blank: 0,
      duplicates: 2,
    });
  });

  it('counts blanks and still treats them as one value', () => {
    expect(datasetStats(list('a', '', '   ', 'b'))).toEqual({
      rows: 4,
      unique: 3,
      blank: 2,
      duplicates: 1,
    });
  });

  it('trims before comparing but does not fold case', () => {
    expect(datasetStats(list('anna', ' anna ', 'Anna'))).toEqual({
      rows: 3,
      unique: 2,
      blank: 0,
      duplicates: 1,
    });
  });

  it('is all zeroes for an empty dataset', () => {
    expect(datasetStats(list())).toEqual({ rows: 0, unique: 0, blank: 0, duplicates: 0 });
  });

  const table = draftDataset({
    columns: [
      { id: 'first', name: 'First' },
      { id: 'email', name: 'Email' },
    ],
    rows: [
      makeRow(0, { first: 'Anna', email: 'anna@example.com' }),
      makeRow(1, { first: 'Anna', email: 'anna.a@example.com' }),
      makeRow(2, { first: 'Bo', email: '' }),
    ],
  });

  it('compares whole rows when no column is selected', () => {
    expect(datasetStats(table)).toEqual({ rows: 3, unique: 3, blank: 0, duplicates: 0 });
  });

  it('compares one column when a column is selected', () => {
    expect(datasetStats(table, 'first')).toEqual({
      rows: 3,
      unique: 2,
      blank: 0,
      duplicates: 1,
    });
  });

  it('counts a blank cell in the selected column as blank', () => {
    expect(datasetStats(table, 'email')).toEqual({
      rows: 3,
      unique: 3,
      blank: 1,
      duplicates: 0,
    });
  });

  it('falls back to whole-row counting when the column id is unknown', () => {
    expect(datasetStats(table, 'nope')).toEqual(datasetStats(table));
  });

  it('counts a row blank only when every cell is empty', () => {
    const rows = draftDataset({
      columns: [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      rows: [makeRow(0, { a: '', b: '' }), makeRow(1, { a: '', b: 'x' })],
    });
    expect(datasetStats(rows).blank).toBe(1);
  });

  it('treats a missing cell as empty rather than undefined', () => {
    const sparse = draftDataset({
      columns: [
        { id: VALUE_COLUMN, name: 'Value' },
        { id: 'extra', name: 'Extra' },
      ],
      rows: [makeRow(0, { [VALUE_COLUMN]: 'a' })],
    });
    expect(datasetStats(sparse, 'extra')).toEqual({
      rows: 1,
      unique: 1,
      blank: 1,
      duplicates: 0,
    });
  });
});
