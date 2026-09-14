import { describe, expect, it } from 'vitest';
import { setOperationTool } from './set-operation';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const KEYS = { keyA: VALUE_COLUMN, keyB: VALUE_COLUMN };

function run(a: string[], b: string[], mode: string): string[] {
  return setOperationTool
    .run(listOf(...a), { ...KEYS, mode }, listOf(...b))
    .output.rows.map((row) => cell(row, VALUE_COLUMN));
}

describe('set operations', () => {
  it('intersects', () => {
    expect(run(['a', 'b', 'c'], ['b', 'c', 'd'], 'intersection')).toEqual(['b', 'c']);
  });

  it('unions without duplicates', () => {
    expect(run(['a', 'b'], ['b', 'c'], 'union')).toEqual(['a', 'b', 'c']);
  });

  it('subtracts the second list from this one', () => {
    expect(run(['a', 'b'], ['b'], 'a-minus-b')).toEqual(['a']);
  });

  it('subtracts this list from the second', () => {
    expect(run(['a', 'b'], ['b', 'c'], 'b-minus-a')).toEqual(['c']);
  });

  it('takes the symmetric difference', () => {
    expect(run(['a', 'b'], ['b', 'c'], 'symmetric')).toEqual(['a', 'c']);
  });

  it('collapses duplicates to one row per value', () => {
    expect(run(['a', 'a', 'b'], ['a'], 'intersection')).toEqual(['a']);
  });

  it('matches across case by default', () => {
    expect(run(['Anna'], ['anna'], 'intersection')).toEqual(['Anna']);
  });

  it('keeps whole rows when both lists have the same columns', () => {
    const a = tableOf(['name', 'email'], [{ name: 'Anna', email: 'x@example.com' }]);
    const b = tableOf(['name', 'email'], [{ name: 'Bo', email: 'y@example.com' }]);
    const result = setOperationTool.run(a, { keyA: 'email', keyB: 'email', mode: 'union' }, b);
    expect(result.output.rows.map((row) => cell(row, 'name'))).toEqual(['Anna', 'Bo']);
  });

  it('falls back to the matched values when the two lists have different columns', () => {
    const a = tableOf(['email'], [{ email: 'x@example.com' }]);
    const b = tableOf(['who', 'mail'], [{ who: 'Bo', mail: 'y@example.com' }]);
    const result = setOperationTool.run(a, { keyA: 'email', keyB: 'mail', mode: 'union' }, b);
    expect(result.output.columns).toHaveLength(1);
    expect(result.warnings?.[0]).toContain('different columns');
  });

  it('keeps A whole when the result needs nothing from B', () => {
    const a = tableOf(['name', 'email'], [{ name: 'Anna', email: 'x@example.com' }]);
    const b = tableOf(['who', 'mail'], [{ who: 'Bo', mail: 'x@example.com' }]);
    const result = setOperationTool.run(
      a,
      { keyA: 'email', keyB: 'mail', mode: 'intersection' },
      b,
    );
    expect(cell(result.output.rows[0]!, 'name')).toBe('Anna');
  });

  it('gives every output row a unique id', () => {
    const result = setOperationTool.run(listOf('a', 'b'), { ...KEYS, mode: 'union' }, listOf('c'));
    const ids = result.output.rows.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('warns and changes nothing without a second list', () => {
    const result = setOperationTool.run(listOf('a'), KEYS);
    expect(result.warnings?.[0]).toBe('Pick a second list to compare with.');
  });

  it('reports what it produced', () => {
    const result = setOperationTool.run(listOf('a', 'b'), { ...KEYS, mode: 'intersection' }, listOf('a'));
    expect(result.summary).toBe('1 row from 2 rows');
  });
});
