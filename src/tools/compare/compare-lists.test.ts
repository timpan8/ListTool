import { describe, expect, it } from 'vitest';
import { compareListsTool } from './compare-lists';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const KEYS = { keyA: [VALUE_COLUMN], keyB: [VALUE_COLUMN] };

function named(name: string, ...values: string[]) {
  return { ...listOf(...values), name };
}

describe('compare lists tool', () => {
  it('produces the side-by-side table, with the lists called by their names', () => {
    const result = compareListsTool.run(named('Kunder', 'a', 'b'), KEYS, named('Leads', 'a', 'c'));
    expect(result.output.columns.map((column) => column.id)).toEqual([
      'status',
      'a_value',
      'b_value',
    ]);
    expect(result.output.rows.map((row) => cell(row, 'status'))).toEqual([
      '✓ In both',
      '← Only in Kunder',
      '→ Only in Leads',
    ]);
    expect(cell(result.output.rows[1]!, 'b_value')).toBe('—');
  });

  it('reports status as text and icon, never colour alone', () => {
    const result = compareListsTool.run(listOf('a'), KEYS, listOf('a'));
    expect(cell(result.output.rows[0]!, 'status')).toContain('In both');
  });

  it('reports counts when they differ, in the status and in count columns', () => {
    const result = compareListsTool.run(named('Kunder', 'a', 'a'), KEYS, named('Leads', 'a'));
    expect(cell(result.output.rows[0]!, 'status')).toBe('≠ 2 in Kunder, 1 in Leads');
    expect(cell(result.output.rows[0]!, 'a_#')).toBe('2');
    expect(result.output.columns.find((column) => column.id === 'a_#')?.name).toBe('Count in Kunder');
  });

  it('accepts a key written as one string, as older recipes wrote it', () => {
    const result = compareListsTool.run(listOf('a'), { keyA: 'value', keyB: 'value' }, listOf('a'));
    expect(cell(result.output.rows[0]!, 'status')).toContain('In both');
  });

  it('falls back to the first column when the default key is not there', () => {
    const result = compareListsTool.run(listOf('a'), { keyA: ['email'], keyB: ['email'] }, listOf('a'));
    expect(cell(result.output.rows[0]!, 'status')).toContain('In both');
  });

  it('summarises matches and differences', () => {
    const result = compareListsTool.run(listOf('a', 'b'), KEYS, listOf('a'));
    expect(result.summary).toBe('2 rows compared: 1 matching, 1 different');
  });

  it('matches on the chosen columns', () => {
    const a = tableOf(['name', 'email'], [{ name: 'Anna', email: 'x@example.com' }]);
    const b = tableOf(['who', 'mail'], [{ who: 'Other', mail: 'X@Example.com' }]);
    const result = compareListsTool.run(a, { keyA: ['email'], keyB: ['mail'] }, b);
    expect(cell(result.output.rows[0]!, 'status')).toContain('In both');
  });

  it('matches on several columns at once', () => {
    const a = tableOf(['first', 'last'], [{ first: 'Anna', last: 'Berg' }]);
    const b = tableOf(['first', 'last'], [{ first: 'anna', last: 'BERG' }]);
    const result = compareListsTool.run(
      a,
      { keyA: ['first', 'last'], keyB: ['first', 'last'] },
      b,
    );
    expect(cell(result.output.rows[0]!, 'status')).toContain('In both');
    expect(cell(result.output.rows[0]!, 'a_first')).toBe('Anna');
    expect(cell(result.output.rows[0]!, 'b_last')).toBe('BERG');
  });

  it('warns and changes nothing without a second list', () => {
    const result = compareListsTool.run(listOf('a'), KEYS);
    expect(result.warnings?.[0]).toBe('Pick a second list to compare with.');
    expect(result.output.columns).toHaveLength(1);
  });

  it('is a dual tool', () => {
    expect(compareListsTool.arity).toBe('dual');
  });
});
