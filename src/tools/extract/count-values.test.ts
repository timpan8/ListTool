import { describe, expect, it } from 'vitest';
import { countValuesTool } from './count-values';
import { cell } from '../../core/model';
import { listOf } from '../../test/fixtures';

function run(values: string[], options = {}) {
  return countValuesTool.run(listOf(...values), options).output;
}

describe('count values', () => {
  it('builds a frequency table, most common first', () => {
    const output = run(['a', 'b', 'a', 'c', 'a', 'b']);
    expect(output.rows.map((row) => cell(row, 'value'))).toEqual(['a', 'b', 'c']);
    expect(output.rows.map((row) => cell(row, 'count'))).toEqual(['3', '2', '1']);
  });

  it('replaces the list with the two-column table', () => {
    expect(run(['a']).columns.map((column) => column.id)).toEqual(['value', 'count']);
  });

  it('groups across case but shows the first spelling', () => {
    const output = run(['Anna', 'anna', 'ANNA']);
    expect(output.rows).toHaveLength(1);
    expect(cell(output.rows[0]!, 'value')).toBe('Anna');
    expect(cell(output.rows[0]!, 'count')).toBe('3');
  });

  it('keeps the spellings apart when case matters', () => {
    expect(run(['Anna', 'anna'], { ignoreCase: false }).rows).toHaveLength(2);
  });

  it('reports the totals', () => {
    expect(countValuesTool.run(listOf('a', 'a', 'b'), {}).summary).toBe(
      '2 distinct values across 3 rows',
    );
  });

  it('handles an empty list', () => {
    expect(run([]).rows).toEqual([]);
  });
});
