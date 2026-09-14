import { describe, expect, it } from 'vitest';
import { findSimilarTool } from './find-similar';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const DEFAULTS = { column: '', threshold: 90, onlyGroups: false };

function run(values: string[], options: Record<string, unknown> = {}) {
  return findSimilarTool.run(listOf(...values), { ...DEFAULTS, ...options });
}

describe('find similar tool', () => {
  it('puts a typo in the same group as the value it is a typo of', () => {
    const output = run(['Andersson', 'Anderson', 'Berg'], { threshold: 80 }).output;
    expect(output.rows.map((row) => cell(row, 'group'))).toEqual(['1', '1', '2']);
  });

  it('suggests the first spelling seen as the one to keep', () => {
    const output = run(['Andersson', 'Anderson'], { threshold: 80 }).output;
    expect(output.rows.map((row) => cell(row, 'suggested'))).toEqual([
      'Andersson',
      'Andersson',
    ]);
  });

  it('adds columns rather than changing a single value', () => {
    const output = run(['Andersson', 'Anderson'], { threshold: 80 }).output;
    expect(output.columns.map((column) => column.name)).toEqual([
      'Value',
      'Group',
      'Suggested',
    ]);
    expect(output.rows.map((row) => cell(row, 'value'))).toEqual(['Andersson', 'Anderson']);
  });

  it('sees the same words in another order as the same value', () => {
    const output = run(['AB Volvo', 'Volvo AB']).output;
    expect(output.rows.map((row) => cell(row, 'group'))).toEqual(['1', '1']);
  });

  it('treats values that differ only in case or padding as one value, not as near ones', () => {
    // Exact repeats are what Remove duplicates is for; this tool is about the rest.
    expect(run(['Anna', ' anna ']).summary).toBe('Nothing changed.');
  });

  it('puts those repeats in the same group when something else is near them', () => {
    const output = run(['Anna', ' anna ', 'Anne'], { threshold: 70 }).output;
    expect(output.rows.map((row) => cell(row, 'group'))).toEqual(['1', '1', '1']);
  });

  it('can keep only the rows that have a near-match', () => {
    const output = run(['Andersson', 'Anderson', 'Berg'], {
      threshold: 80,
      onlyGroups: true,
    }).output;
    expect(output.rows.map((row) => cell(row, 'value'))).toEqual(['Andersson', 'Anderson']);
  });

  it('finds nothing at a threshold of 100 unless the values are already equal', () => {
    const result = run(['Andersson', 'Anderson'], { threshold: 100 });
    expect(result.summary).toBe('Nothing changed.');
    expect(result.warnings?.[0]).toContain('close enough');
  });

  it('clamps a threshold outside the range instead of doing something strange', () => {
    expect(run(['a', 'b'], { threshold: 300 }).summary).toBe('Nothing changed.');
    expect(run(['a', 'b'], { threshold: -50 }).output.rows[0]).toBeDefined();
  });

  it('keeps the row ids, because it only adds columns', () => {
    const list = listOf('Andersson', 'Anderson');
    const output = findSimilarTool.run(list, { ...DEFAULTS, threshold: 80 }).output;
    expect(output.rows.map((row) => row.id)).toEqual(list.rows.map((row) => row.id));
  });

  it('works on a chosen column of a table', () => {
    const dataset = tableOf(
      ['name', 'city'],
      [
        { name: 'Anna', city: 'Göteborg' },
        { name: 'Bo', city: 'Goteborg' },
      ],
    );
    const output = findSimilarTool.run(dataset, {
      ...DEFAULTS,
      column: 'city',
      threshold: 80,
    }).output;
    expect(output.rows.map((row) => cell(row, 'group'))).toEqual(['1', '1']);
  });

  it('counts the groups it found', () => {
    const result = run(['Andersson', 'Anderson', 'Berg', 'Berg'], { threshold: 80 });
    expect(result.summary).toBe('1 group contain values that are nearly the same');
    expect(result.stats).toEqual({ groups: 1, clusters: 2 });
  });

  it('handles an empty list', () => {
    expect(run([]).summary).toBe('Nothing changed.');
  });

  it('never mutates its input', () => {
    const dataset = listOf('Andersson', 'Anderson');
    const before = JSON.stringify(dataset);
    findSimilarTool.run(dataset, { ...DEFAULTS, threshold: 80 });
    expect(JSON.stringify(dataset)).toBe(before);
  });
});
