import { describe, expect, it, vi } from 'vitest';
import { memoByDataset } from './memo';
import { listOf } from '../test/fixtures';

describe('memoByDataset', () => {
  it('computes once per dataset object and hands the same answer back', () => {
    const compute = vi.fn((dataset: { rows: unknown[] }) => ({ n: dataset.rows.length }));
    const count = memoByDataset(compute);
    const dataset = listOf('a', 'b');
    const first = count(dataset);
    expect(count(dataset)).toBe(first);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('computes again for a new object, even an equal one', () => {
    const compute = vi.fn((dataset: { rows: unknown[] }) => dataset.rows.length);
    const count = memoByDataset(compute);
    count(listOf('a'));
    count(listOf('a'));
    expect(compute).toHaveBeenCalledTimes(2);
  });

  it('remembers an answer that happens to be undefined', () => {
    const compute = vi.fn(() => undefined);
    const nothing = memoByDataset(compute);
    const dataset = listOf('a');
    nothing(dataset);
    nothing(dataset);
    expect(compute).toHaveBeenCalledTimes(1);
  });
});
