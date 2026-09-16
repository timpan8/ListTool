import { describe, expect, it } from 'vitest';
import { columnMathsTool } from './column-maths';
import { cell } from '../../core/model';
import { listOf } from '../../test/fixtures';

function added(values: string[], options: Record<string, unknown>): string[] {
  const result = columnMathsTool.run(listOf(...values), { column: 'value', ...options });
  const target = result.output.columns[1]?.id as string;
  return result.output.rows.map((row) => cell(row, target));
}

describe('column maths tool', () => {
  it('ranks, largest first by default, and leaves gaps after ties', () => {
    expect(added(['10', '30', '20', '30'], { how: 'rank' })).toEqual(['4', '1', '3', '1']);
    expect(added(['10', '30', '20', '30'], { how: 'rank', direction: 'asc' })).toEqual([
      '1',
      '3',
      '2',
      '3',
    ]);
  });

  it('ranks densely when asked', () => {
    expect(added(['10', '30', '20', '30'], { how: 'denseRank' })).toEqual(['3', '1', '2', '1']);
  });

  it('runs a total, in row order', () => {
    expect(added(['1', '2,5', '3'], { how: 'runningTotal', decimals: 1 })).toEqual(['1,0', '3,5', '6,5']);
  });

  it('gives each row its share of the total', () => {
    expect(added(['1', '3'], { how: 'share', decimals: 0 })).toEqual(['25', '75']);
  });

  it('gives the difference from the row before, with nothing for the first', () => {
    expect(added(['10', '12', '9'], { how: 'difference', decimals: 0 })).toEqual(['', '2', '-3']);
  });

  it('leaves a result empty where the value is not a number, and says how many', () => {
    const result = columnMathsTool.run(listOf('10', 'n/a', '', '5'), { column: 'value', how: 'rank' });
    const target = result.output.columns[1]?.id as string;
    expect(result.output.rows.map((row) => cell(row, target))).toEqual(['1', '', '', '2']);
    expect(result.warnings).toEqual(['1 cell is not a number and got no result']);
  });

  it('names the column after the calculation, or as typed', () => {
    const rank = columnMathsTool.run(listOf('1'), { column: 'value', how: 'share' });
    expect(rank.output.columns[1]?.name).toBe('Share %');
    const typed = columnMathsTool.run(listOf('1'), { column: 'value', name: 'Andel' });
    expect(typed.output.columns[1]?.name).toBe('Andel');
    expect(typed.summary).toBe('Added Andel for 1 row');
  });

  it('keeps every row its id', () => {
    const result = columnMathsTool.run(listOf('1', '2'), { column: 'value' });
    expect(result.output.rows.map((row) => row.id)).toEqual(['r1', 'r2']);
  });
});
