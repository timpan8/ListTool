import { describe, expect, it } from 'vitest';
import { mapCells, NORMALIZE_FIELDS, readNormalize, rowIdsAfter } from './helpers';
import { listOf, tableOf } from '../test/fixtures';
import { VALUE_COLUMN } from '../core/model';

describe('the shared matching rules', () => {
  it('are the same four, in the same order, wherever a tool builds keys', () => {
    expect(NORMALIZE_FIELDS.map((field) => field.key)).toEqual([
      'trim',
      'ignoreCase',
      'collapseWhitespace',
      'ignoreDiacritics',
    ]);
    for (const field of NORMALIZE_FIELDS) expect(field.type).toBe('boolean');
  });

  it('read with their defaults: trim and case on, the rest off', () => {
    expect(readNormalize({})).toEqual({
      trim: true,
      ignoreCase: true,
      collapseWhitespace: false,
      ignoreDiacritics: false,
    });
    expect(readNormalize({ ignoreDiacritics: true, trim: false })).toMatchObject({
      trim: false,
      ignoreDiacritics: true,
    });
  });
});

describe('rowIdsAfter', () => {
  it('continues past the highest id in the list, gaps and all', () => {
    const dataset = tableOf(['v'], [{ v: 'a' }, { v: 'b' }, { v: 'c' }]);
    const gapped = { ...dataset, rows: dataset.rows.filter((row) => row.id !== 'r2') };
    const next = rowIdsAfter(gapped);
    expect(next()).toBe('r4');
    expect(next()).toBe('r5');
  });

  it('starts at r1 for an empty list, and ignores ids it did not mint', () => {
    expect(rowIdsAfter({ rows: [] })()).toBe('r1');
    expect(rowIdsAfter({ rows: [{ id: 'x', cells: {} }, { id: 'r7', cells: {} }] })()).toBe('r8');
  });
});

describe('mapCells', () => {
  it('hands back the very same row object when nothing in it changed', () => {
    const dataset = listOf(' a ', 'b');
    const { rows, changed } = mapCells(dataset, dataset.columns, (value) => value.trim());
    expect(changed).toBe(1);
    expect(rows[0]).not.toBe(dataset.rows[0]);
    expect(rows[1]).toBe(dataset.rows[1]);
    expect(rows[0]?.cells[VALUE_COLUMN]).toBe('a');
  });

  it('never mutates the rows it was given', () => {
    const dataset = listOf(' a ');
    mapCells(dataset, dataset.columns, (value) => value.trim());
    expect(dataset.rows[0]?.cells[VALUE_COLUMN]).toBe(' a ');
  });
});
