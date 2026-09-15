import { describe, expect, it } from 'vitest';
import { sampleTool } from './sample';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf } from '../../test/fixtures';

const TEN = listOf('a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j');
const BASE = { mode: 'first', count: 3, step: 3, seed: 1 };

function took(options: Record<string, unknown>): string[] {
  return sampleTool
    .run(TEN, { ...BASE, ...options })
    .output.rows.map((row) => cell(row, VALUE_COLUMN));
}

describe('sample tool', () => {
  it('takes the first rows', () => {
    expect(took({ mode: 'first' })).toEqual(['a', 'b', 'c']);
  });

  it('takes the last rows', () => {
    expect(took({ mode: 'last' })).toEqual(['h', 'i', 'j']);
  });

  it('takes every nth row, starting with the first', () => {
    expect(took({ mode: 'every', step: 3 })).toEqual(['a', 'd', 'g', 'j']);
  });

  it('takes a random selection of the size asked for', () => {
    expect(took({ mode: 'random', count: 4 })).toHaveLength(4);
  });

  it('gives the same random selection for the same seed, and another for another', () => {
    const one = took({ mode: 'random', count: 4, seed: 7 });
    expect(took({ mode: 'random', count: 4, seed: 7 })).toEqual(one);
    expect(took({ mode: 'random', count: 4, seed: 8 })).not.toEqual(one);
  });

  it('leaves a random sample in the list order, not in the order it was drawn', () => {
    const drawn = took({ mode: 'random', count: 5, seed: 3 });
    expect([...drawn].sort()).toEqual(drawn);
  });

  it('keeps the row ids of what it took', () => {
    const output = sampleTool.run(TEN, { ...BASE, mode: 'first', count: 2 }).output;
    expect(output.rows.map((row) => row.id)).toEqual(['r1', 'r2']);
  });

  it('says so rather than pretending when the list is already that short', () => {
    const result = sampleTool.run(listOf('a', 'b'), { ...BASE, count: 5 });
    expect(result.summary).toBe('Nothing changed.');
    expect(result.warnings?.[0]).toBe('The list is already that short.');
  });

  it('reads a count or step below one as one, rather than returning nothing', () => {
    expect(took({ mode: 'first', count: 0 })).toEqual(['a']);
    // Every 1st row is every row, so there is nothing to take away.
    expect(sampleTool.run(TEN, { ...BASE, mode: 'every', step: 0 }).summary).toBe(
      'Nothing changed.',
    );
  });

  it('rounds a fractional count down', () => {
    expect(took({ mode: 'first', count: 2.9 })).toEqual(['a', 'b']);
  });

  it('says what it took', () => {
    expect(sampleTool.run(TEN, { ...BASE, count: 3 }).summary).toBe('Took 3 of 10 rows');
  });

  it('handles an empty list', () => {
    expect(sampleTool.run(listOf(), BASE).output.rows).toEqual([]);
  });

  it('never mutates its input', () => {
    const before = JSON.stringify(TEN);
    sampleTool.run(TEN, { ...BASE, mode: 'random' });
    expect(JSON.stringify(TEN)).toBe(before);
  });
});
