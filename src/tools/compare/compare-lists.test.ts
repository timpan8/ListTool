import { describe, expect, it } from 'vitest';
import { compareListsTool } from './compare-lists';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const KEYS = { keyA: [VALUE_COLUMN], keyB: [VALUE_COLUMN] };

describe('compare lists tool', () => {
  it('produces the aligned table', () => {
    const result = compareListsTool.run(listOf('a', 'b'), KEYS, listOf('a', 'c'));
    expect(result.output.columns.map((column) => column.id)).toEqual([
      'a',
      'b',
      'status',
      'countA',
      'countB',
    ]);
    expect(result.output.rows.map((row) => cell(row, 'status'))).toEqual([
      '✓ Match',
      '← Only in A',
      '→ Only in B',
    ]);
  });

  it('reports status as text and icon, never colour alone', () => {
    const result = compareListsTool.run(listOf('a'), KEYS, listOf('a'));
    expect(cell(result.output.rows[0]!, 'status')).toContain('Match');
  });

  it('reports counts when they differ', () => {
    const result = compareListsTool.run(listOf('a', 'a'), KEYS, listOf('a'));
    expect(cell(result.output.rows[0]!, 'status')).toContain('Count differs');
    expect(cell(result.output.rows[0]!, 'countA')).toBe('2');
  });

  it('summarises matches and differences', () => {
    const result = compareListsTool.run(listOf('a', 'b'), KEYS, listOf('a'));
    expect(result.summary).toBe('2 rows compared: 1 matching, 1 different');
  });

  it('matches on the chosen columns', () => {
    const a = tableOf(['name', 'email'], [{ name: 'Anna', email: 'x@example.com' }]);
    const b = tableOf(['who', 'mail'], [{ who: 'Other', mail: 'X@Example.com' }]);
    const result = compareListsTool.run(a, { keyA: ['email'], keyB: ['mail'] }, b);
    expect(cell(result.output.rows[0]!, 'status')).toContain('Match');
  });

  it('matches on several columns at once', () => {
    const a = tableOf(['first', 'last'], [{ first: 'Anna', last: 'Berg' }]);
    const b = tableOf(['first', 'last'], [{ first: 'anna', last: 'BERG' }]);
    const result = compareListsTool.run(
      a,
      { keyA: ['first', 'last'], keyB: ['first', 'last'] },
      b,
    );
    expect(cell(result.output.rows[0]!, 'status')).toContain('Match');
    expect(cell(result.output.rows[0]!, 'a')).toBe('Anna \u00b7 Berg');
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
