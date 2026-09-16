import { describe, expect, it } from 'vitest';
import { normalizeDatesTool } from './normalize-dates';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf } from '../../test/fixtures';

const values = (rows: { cells: Record<string, string> }[]): string[] =>
  rows.map((row) => row.cells[VALUE_COLUMN] ?? '');

describe('normalise dates tool', () => {
  it('writes every readable date as ISO, whatever shape it came in', () => {
    const input = listOf('15/09/2026', '15 sep 2026', '20260915', '2026-09-15', 'Sep 5, 2026');
    const result = normalizeDatesTool.run(input, { column: '' });
    expect(values(result.output.rows)).toEqual([
      '2026-09-15',
      '2026-09-15',
      '2026-09-15',
      '2026-09-15',
      '2026-09-05',
    ]);
    expect(result.summary).toBe('Rewrote 4 cells');
  });

  it('reads month first when told to, and writes other shapes', () => {
    const input = listOf('09/15/2026');
    expect(values(normalizeDatesTool.run(input, { dayFirst: 'mdy', shape: 'dmy' }).output.rows)).toEqual([
      '15/09/2026',
    ]);
    expect(values(normalizeDatesTool.run(input, { dayFirst: 'mdy', shape: 'compact' }).output.rows)).toEqual([
      '20260915',
    ]);
  });

  it('leaves what is not a date alone, and says how many', () => {
    const result = normalizeDatesTool.run(listOf('15/09/2026', 'unknown', ''), { column: '' });
    expect(values(result.output.rows)).toEqual(['2026-09-15', 'unknown', '']);
    expect(result.warnings).toEqual(['1 cell is not a date and was left as it is']);
  });

  it('can blank what is not a date instead', () => {
    const result = normalizeDatesTool.run(listOf('15/09/2026', 'unknown'), { keepUnparsed: false });
    expect(values(result.output.rows)).toEqual(['2026-09-15', '']);
  });

  it('hands the list back when every date is already written that way', () => {
    const input = listOf('2026-09-15', 'text');
    const result = normalizeDatesTool.run(input, {});
    expect(result.output).toBe(input);
    expect(result.warnings).toEqual(['Every date is already written that way.']);
  });

  it('flags a column whose dates are written in more than one way', () => {
    expect(normalizeDatesTool.check?.(listOf('2026-09-15', '15/09/2026', 'x'))?.count).toBe(2);
    expect(normalizeDatesTool.check?.(listOf('2026-09-15', '2026-09-16'))).toBeNull();
    expect(normalizeDatesTool.check?.(listOf('15/09/2026', '16/09/2026'))).toBeNull();
  });

  it('never mutates its input', () => {
    const input = listOf('15/09/2026');
    normalizeDatesTool.run(input, {});
    expect(cell(input.rows[0]!, VALUE_COLUMN)).toBe('15/09/2026');
  });
});
