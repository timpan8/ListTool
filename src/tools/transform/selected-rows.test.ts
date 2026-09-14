import { describe, expect, it } from 'vitest';
import { selectedRowsTool } from './selected-rows';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf } from '../../test/fixtures';

function run(rows: string[], mode: string) {
  return selectedRowsTool.run(listOf('a', 'b', 'c'), { rows, mode });
}

describe('selected rows tool', () => {
  it('keeps only the ticked rows', () => {
    const output = run(['r1', 'r3'], 'keep').output;
    expect(output.rows.map((row) => cell(row, VALUE_COLUMN))).toEqual(['a', 'c']);
  });

  it('removes the ticked rows', () => {
    const output = run(['r2'], 'remove').output;
    expect(output.rows.map((row) => cell(row, VALUE_COLUMN))).toEqual(['a', 'c']);
  });

  it('keeps the rows in the list order, not in the order they were ticked', () => {
    const output = run(['r3', 'r1'], 'keep').output;
    expect(output.rows.map((row) => cell(row, VALUE_COLUMN))).toEqual(['a', 'c']);
  });

  it('keeps the row ids of what survives', () => {
    expect(run(['r2'], 'remove').output.rows.map((row) => row.id)).toEqual(['r1', 'r3']);
  });

  it('does nothing when nothing is ticked', () => {
    expect(run([], 'keep').summary).toBe('Nothing changed.');
    expect(run([], 'remove').output.rows).toHaveLength(3);
  });

  it('does nothing when every row is ticked and the mode is keep', () => {
    expect(run(['r1', 'r2', 'r3'], 'keep').summary).toBe('Nothing changed.');
  });

  it('refuses to empty the list', () => {
    const result = run(['r1', 'r2', 'r3'], 'remove');
    expect(result.warnings?.[0]).toBe('Keeping none of the rows would empty the list.');
    expect(result.output.rows).toHaveLength(3);
  });

  it('ignores a row id that is no longer in the list', () => {
    expect(run(['r9'], 'remove').summary).toBe('Nothing changed.');
  });

  it('says what it did, in the words of the mode', () => {
    expect(run(['r1'], 'keep').summary).toBe('Kept 1 of 3 rows');
    expect(run(['r1'], 'remove').summary).toBe('Removed 1 of 3 rows');
    expect(run(['r1'], 'remove').stats).toEqual({ kept: 2, removed: 1 });
  });

  it('never mutates its input', () => {
    const dataset = listOf('a', 'b');
    const before = JSON.stringify(dataset);
    selectedRowsTool.run(dataset, { rows: ['r1'], mode: 'remove' });
    expect(JSON.stringify(dataset)).toBe(before);
  });
});
