import { describe, expect, it } from 'vitest';
import { reorderRowsTool, shuffle } from './reorder-rows';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf } from '../../test/fixtures';

function run(values: string[], options: Record<string, unknown>): string[] {
  return reorderRowsTool
    .run(listOf(...values), options)
    .output.rows.map((row) => cell(row, VALUE_COLUMN));
}

describe('reverse', () => {
  it('turns the list around', () => {
    expect(run(['a', 'b', 'c'], {})).toEqual(['c', 'b', 'a']);
  });

  it('is its own inverse', () => {
    expect(run(run(['a', 'b', 'c'], {}), {})).toEqual(['a', 'b', 'c']);
  });
});

describe('shuffle', () => {
  it('keeps every row, just in another order', () => {
    const shuffled = run(['a', 'b', 'c', 'd', 'e'], { mode: 'shuffle', seed: 7 });
    expect([...shuffled].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('is reproducible, so a recipe replays the same order', () => {
    const options = { mode: 'shuffle', seed: 7 };
    expect(run(['a', 'b', 'c', 'd'], options)).toEqual(run(['a', 'b', 'c', 'd'], options));
  });

  it('gives a different order for a different seed', () => {
    const values = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    expect(run(values, { mode: 'shuffle', seed: 1 })).not.toEqual(
      run(values, { mode: 'shuffle', seed: 2 }),
    );
  });

  it('never mutates the rows it is given', () => {
    const rows = listOf('a', 'b', 'c').rows;
    shuffle(rows, 3);
    expect(rows.map((row) => cell(row, VALUE_COLUMN))).toEqual(['a', 'b', 'c']);
  });

  it('handles an empty and a single-row list', () => {
    expect(run([], { mode: 'shuffle' })).toEqual([]);
    expect(run(['only'], { mode: 'shuffle' })).toEqual(['only']);
  });
});
