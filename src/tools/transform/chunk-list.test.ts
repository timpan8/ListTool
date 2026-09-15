import { describe, expect, it } from 'vitest';
import { chunkListTool } from './chunk-list';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf } from '../../test/fixtures';

const DEFAULTS = { size: 2, pattern: '{name} {n}' };

function values(dataset: { rows: { cells: Record<string, string> }[] }): string[] {
  return dataset.rows.map((row) => row.cells[VALUE_COLUMN] ?? '');
}

describe('chunk list tool', () => {
  it('leaves the first batch in place and opens the rest as further lists', () => {
    const result = chunkListTool.run(listOf('a', 'b', 'c', 'd', 'e'), DEFAULTS);

    expect(values(result.output)).toEqual(['a', 'b']);
    expect(result.extraLists?.map((extra) => values(extra.dataset))).toEqual([
      ['c', 'd'],
      ['e'],
    ]);
  });

  it('names each further batch from the pattern, counting from two', () => {
    const result = chunkListTool.run(listOf('a', 'b', 'c', 'd', 'e'), DEFAULTS);
    expect(result.extraLists?.map((extra) => extra.name)).toEqual(['A 2', 'A 3']);
  });

  it('accepts a pattern of your own', () => {
    const result = chunkListTool.run(listOf('a', 'b', 'c'), {
      ...DEFAULTS,
      pattern: 'Batch {n}',
    });
    expect(result.extraLists?.[0]?.name).toBe('Batch 2');
  });

  it('keeps every row its id, so the preview can say which rows went where', () => {
    const result = chunkListTool.run(listOf('a', 'b', 'c'), DEFAULTS);
    expect(result.output.rows.map((row) => row.id)).toEqual(['r1', 'r2']);
    expect(result.extraLists?.[0]?.dataset.rows.map((row) => row.id)).toEqual(['r3']);
  });

  it('keeps the columns of the list it split', () => {
    const result = chunkListTool.run(listOf('a', 'b', 'c'), DEFAULTS);
    expect(result.extraLists?.[0]?.dataset.columns).toEqual(result.output.columns);
    expect(cell(result.extraLists![0]!.dataset.rows[0]!, VALUE_COLUMN)).toBe('c');
  });

  it('does nothing when the list already fits in one batch', () => {
    const result = chunkListTool.run(listOf('a', 'b'), DEFAULTS);
    expect(result.summary).toBe('Nothing changed.');
    expect(result.warnings?.[0]).toContain('already fits');
    expect(result.extraLists).toBeUndefined();
  });

  it('refuses a batch size below one instead of looping forever', () => {
    const result = chunkListTool.run(listOf('a', 'b'), { ...DEFAULTS, size: 0 });
    expect(result.warnings?.[0]).toBe('A batch needs at least one row.');
    expect(result.output.rows).toHaveLength(2);
  });

  it('rounds a fractional size down', () => {
    const result = chunkListTool.run(listOf('a', 'b', 'c'), { ...DEFAULTS, size: 2.9 });
    expect(values(result.output)).toEqual(['a', 'b']);
  });

  it('splits one row per batch when asked', () => {
    const result = chunkListTool.run(listOf('a', 'b', 'c'), { ...DEFAULTS, size: 1 });
    expect(result.extraLists).toHaveLength(2);
    expect(result.summary).toBe('Split 3 rows into 3 batches');
  });

  it('never mutates its input', () => {
    const dataset = listOf('a', 'b', 'c');
    const before = JSON.stringify(dataset);
    chunkListTool.run(dataset, DEFAULTS);
    expect(JSON.stringify(dataset)).toBe(before);
  });
});
