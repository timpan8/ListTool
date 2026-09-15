import { describe, expect, it } from 'vitest';
import { cellKey, changedFirst, diffDatasets } from './diff';
import { makeRow, VALUE_COLUMN } from './model';
import { listOf, tableOf } from '../test/fixtures';
import { trimTool } from '../tools/clean/trim';
import { withRows } from '../tools/helpers';

describe('cellKey', () => {
  it('cannot collide across a row and column boundary', () => {
    expect(cellKey('r1', 'ab')).not.toBe(cellKey('r1a', 'b'));
  });
});

describe('diffDatasets', () => {
  it('reports nothing when nothing changed', () => {
    const dataset = listOf('a', 'b');
    const diff = diffDatasets(dataset, dataset);
    expect(diff.changedCells.size).toBe(0);
    expect(diff.addedRows.size).toBe(0);
    expect(diff.removedRows).toBe(0);
    expect(diff.addedColumns.size).toBe(0);
  });

  it('names exactly the cells a tool rewrote', () => {
    const before = listOf(' a ', 'b');
    const after = trimTool.run(before, { column: '' }).output;
    const diff = diffDatasets(before, after);

    expect([...diff.changedCells]).toEqual([cellKey('r1', VALUE_COLUMN)]);
  });

  it('matches rows by id, not by position, so a sort is not every cell changing', () => {
    const before = listOf('b', 'a');
    const after = withRows(before, [before.rows[1]!, before.rows[0]!]);
    expect(diffDatasets(before, after).changedCells.size).toBe(0);
  });

  it('reports a brand new column as a column, not as every cell in it changing', () => {
    const before = listOf('a', 'b');
    const after = {
      ...before,
      columns: [...before.columns, { id: 'n', name: 'Number' }],
      rows: before.rows.map((row, index) => ({
        ...row,
        cells: { ...row.cells, n: String(index + 1) },
      })),
    };
    const diff = diffDatasets(before, after);

    expect([...diff.addedColumns]).toEqual(['n']);
    expect(diff.changedCells.size).toBe(0);
  });

  it('separates rows that arrived from rows that left', () => {
    const before = listOf('a', 'b');
    const after = withRows(before, [before.rows[0]!, makeRow(9, { [VALUE_COLUMN]: 'c' })]);
    const diff = diffDatasets(before, after);

    expect([...diff.addedRows]).toEqual(['r10']);
    expect(diff.removedRows).toBe(1);
  });

  it('counts every removed row when a tool only removes', () => {
    const before = listOf('a', 'b', 'c');
    const diff = diffDatasets(before, withRows(before, [before.rows[1]!]));
    expect(diff.removedRows).toBe(2);
    expect(diff.addedRows.size).toBe(0);
  });

  it('sees a cell cleared to empty as a change', () => {
    const before = tableOf(['first', 'last'], [{ first: 'Anna', last: 'Berg' }]);
    const after = withRows(before, [makeRow(0, { first: 'Anna', last: '' })]);
    expect([...diffDatasets(before, after).changedCells]).toEqual([cellKey('r1', 'last')]);
  });

  it('sees a dropped column as no cell change at all', () => {
    const before = tableOf(['first', 'last'], [{ first: 'Anna', last: 'Berg' }]);
    const after = { ...before, columns: [before.columns[0]!] };
    const diff = diffDatasets(before, after);

    expect(diff.changedCells.size).toBe(0);
    expect(diff.addedColumns.size).toBe(0);
  });

  it('handles both sides being empty', () => {
    const empty = listOf();
    expect(diffDatasets(empty, empty).changedCells.size).toBe(0);
  });

  it('never mutates either side', () => {
    const before = listOf(' a ');
    const after = trimTool.run(before, { column: '' }).output;
    const snapshot = [JSON.stringify(before), JSON.stringify(after)];
    diffDatasets(before, after);
    expect([JSON.stringify(before), JSON.stringify(after)]).toEqual(snapshot);
  });
});

describe('changedFirst', () => {
  const before = listOf('a', ' b ', 'c', ' d ');

  it('puts the rows a tool touched first, each group in its own order', () => {
    const after = trimTool.run(before, {}).output;
    const { rows, changed } = changedFirst(after, diffDatasets(before, after));
    expect(changed).toBe(2);
    expect(rows.map((row) => row.id)).toEqual(['r2', 'r4', 'r1', 'r3']);
  });

  it('counts a new row as touched', () => {
    const after = withRows(before, [...before.rows, makeRow(9, { [VALUE_COLUMN]: 'e' })]);
    const { rows, changed } = changedFirst(after, diffDatasets(before, after));
    expect(changed).toBe(1);
    expect(rows[0]?.id).toBe('r10');
  });

  it('hands the output rows back untouched when nothing changed', () => {
    const { rows, changed } = changedFirst(before, diffDatasets(before, before));
    expect(changed).toBe(0);
    expect(rows).toBe(before.rows);
  });
});
