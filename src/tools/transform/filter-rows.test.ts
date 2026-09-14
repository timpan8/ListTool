import { describe, expect, it } from 'vitest';
import { filterRowsTool } from './filter-rows';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

function values(input: string[], options: Record<string, unknown>): string[] {
  return filterRowsTool
    .run(listOf(...input), options)
    .output.rows.map((row) => cell(row, VALUE_COLUMN));
}

describe('filter rows', () => {
  it('keeps rows that contain the text', () => {
    expect(values(['anna', 'bob', 'joanna'], { pattern: 'anna' })).toEqual(['anna', 'joanna']);
  });

  it('removes them instead when inverted', () => {
    expect(values(['anna', 'bob'], { pattern: 'anna', invert: true })).toEqual(['bob']);
  });

  it('matches equals, starts with and ends with', () => {
    expect(values(['anna', 'annabel'], { pattern: 'anna', mode: 'equals' })).toEqual(['anna']);
    expect(values(['anna', 'banana'], { pattern: 'an', mode: 'starts' })).toEqual(['anna']);
    expect(values(['anna', 'annab'], { pattern: 'na', mode: 'ends' })).toEqual(['anna']);
  });

  it('matches a regular expression', () => {
    expect(values(['a1', 'b2', 'cc'], { pattern: '\\d', mode: 'regex' })).toEqual(['a1', 'b2']);
  });

  it('ignores case by default and respects it when told to', () => {
    expect(values(['Anna'], { pattern: 'anna' })).toEqual(['Anna']);
    expect(values(['Anna'], { pattern: 'anna', ignoreCase: false })).toEqual([]);
  });

  it('warns and changes nothing on a broken pattern', () => {
    const result = filterRowsTool.run(listOf('a'), { pattern: '[', mode: 'regex' });
    expect(result.output.rows).toHaveLength(1);
    expect(result.warnings?.[0]).toContain('not a valid regular expression');
  });

  it('does nothing without a pattern', () => {
    expect(filterRowsTool.run(listOf('a'), { pattern: '' }).summary).toBe('Nothing changed.');
  });

  it('reports how many rows survived', () => {
    expect(filterRowsTool.run(listOf('a', 'b'), { pattern: 'a' }).summary).toBe(
      'Kept 1 of 2 rows',
    );
  });

  it('matches in any column by default', () => {
    const table = tableOf(['first', 'email'], [{ first: 'Anna', email: 'x@example.com' }]);
    expect(filterRowsTool.run(table, { pattern: 'example' }).output.rows).toHaveLength(1);
  });

  it('matches only the chosen column when one is chosen', () => {
    const table = tableOf(['first', 'email'], [{ first: 'Anna', email: 'x@example.com' }]);
    expect(
      filterRowsTool.run(table, { pattern: 'example', column: 'first' }).output.rows,
    ).toHaveLength(0);
  });
});
