import { describe, expect, it } from 'vitest';
import { removeRowsInBTool } from './remove-rows-in-b';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const KEYS = { keyA: VALUE_COLUMN, keyB: VALUE_COLUMN };

function run(a: string[], b: string[], options = {}): string[] {
  return removeRowsInBTool
    .run(listOf(...a), { ...KEYS, ...options }, listOf(...b))
    .output.rows.map((row) => cell(row, VALUE_COLUMN));
}

describe('remove rows found in list B', () => {
  it('drops what the other list has', () => {
    expect(run(['a', 'b', 'c'], ['b'])).toEqual(['a', 'c']);
  });

  it('keeps every copy of a value that is not in B', () => {
    expect(run(['a', 'a', 'b'], ['b'])).toEqual(['a', 'a']);
  });

  it('drops every copy of a value that is in B', () => {
    expect(run(['a', 'a', 'b'], ['a'])).toEqual(['b']);
  });

  it('matches across case and padding by default', () => {
    expect(run(['Anna ', 'Bo'], ['anna'])).toEqual(['Bo']);
  });

  it('respects case when told to', () => {
    expect(run(['Anna'], ['anna'], { ignoreCase: false })).toEqual(['Anna']);
  });

  it('matches on the chosen columns', () => {
    const a = tableOf(['name', 'email'], [{ name: 'Anna', email: 'x@example.com' }]);
    const b = tableOf(['mail'], [{ mail: 'X@Example.com' }]);
    const result = removeRowsInBTool.run(a, { keyA: 'email', keyB: 'mail' }, b);
    expect(result.output.rows).toEqual([]);
  });

  it('reports the before and after counts', () => {
    const result = removeRowsInBTool.run(listOf('a', 'b'), KEYS, listOf('b'));
    expect(result.summary).toBe('Removed 1 row (2 rows → 1 row)');
  });

  it('warns and changes nothing without a second list', () => {
    const result = removeRowsInBTool.run(listOf('a'), KEYS);
    expect(result.warnings?.[0]).toBe('Pick a second list to compare with.');
  });
});
