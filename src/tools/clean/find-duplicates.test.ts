import { describe, expect, it } from 'vitest';
import { findDuplicatesTool } from './find-duplicates';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf } from '../../test/fixtures';

function run(values: string[], options = {}) {
  return findDuplicatesTool.run(listOf(...values), options).output;
}

describe('find duplicates', () => {
  it('keeps only the values that repeat, with their counts', () => {
    const output = run(['a', 'b', 'a', 'c', 'a']);
    expect(output.rows.map((row) => cell(row, VALUE_COLUMN))).toEqual(['a', 'a', 'a']);
    expect(output.rows.map((row) => cell(row, 'count'))).toEqual(['3', '3', '3']);
  });

  it('removes nothing from the list it reports on', () => {
    const output = run(['a', 'b', 'a'], { onlyDuplicates: false });
    expect(output.rows).toHaveLength(3);
    expect(output.rows.map((row) => cell(row, 'count'))).toEqual(['2', '1', '2']);
  });

  it('adds a count column rather than replacing anything', () => {
    const output = run(['a', 'a']);
    expect(output.columns.map((column) => column.id)).toEqual([VALUE_COLUMN, 'count']);
  });

  it('groups across case by default', () => {
    expect(run(['Anna', 'anna']).rows).toHaveLength(2);
  });

  it('respects case when told to', () => {
    expect(run(['Anna', 'anna'], { ignoreCase: false }).rows).toHaveLength(0);
  });

  it('reports how many values repeat', () => {
    expect(findDuplicatesTool.run(listOf('a', 'a', 'b', 'b'), {}).summary).toBe(
      '2 values appear more than once',
    );
  });

  it('finds nothing in an all-unique list', () => {
    expect(run(['a', 'b']).rows).toEqual([]);
  });
});
