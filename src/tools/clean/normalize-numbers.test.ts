import { describe, expect, it } from 'vitest';
import { normalizeNumbersTool } from './normalize-numbers';
import { VALUE_COLUMN } from '../../core/model';
import { listOf } from '../../test/fixtures';

const values = (rows: { cells: Record<string, string> }[]): string[] =>
  rows.map((row) => row.cells[VALUE_COLUMN] ?? '');

describe('normalise numbers tool', () => {
  it('writes every number the Swedish way by default', () => {
    const result = normalizeNumbersTool.run(listOf('1,234.50', '1234.5', '12', '-1 000'), {});
    expect(values(result.output.rows)).toEqual(['1 234,5', '1 234,5', '12', '-1 000']);
    expect(result.summary).toBe('Rewrote 2 cells');
  });

  it('writes the English way, with fixed decimals, when asked', () => {
    const result = normalizeNumbersTool.run(listOf('1 234,5', '7'), {
      decimal: '.',
      thousands: ',',
      decimals: '2',
    });
    expect(values(result.output.rows)).toEqual(['1,234.50', '7.00']);
  });

  it('can drop the thousands separator', () => {
    const result = normalizeNumbersTool.run(listOf('1 234 567'), { thousands: 'none' });
    expect(values(result.output.rows)).toEqual(['1234567']);
  });

  it('leaves what is not a number alone, and says how many', () => {
    const result = normalizeNumbersTool.run(listOf('1,234.5', 'n/a', ''), {});
    expect(values(result.output.rows)).toEqual(['1 234,5', 'n/a', '']);
    expect(result.warnings).toEqual(['1 cell is not a number and was left as it is']);
  });

  it('hands the list back when every number is already written that way', () => {
    const input = listOf('1 234,5', 'text');
    const result = normalizeNumbersTool.run(input, {});
    expect(result.output).toBe(input);
  });

  it('flags a column whose numbers disagree about the decimal mark', () => {
    expect(normalizeNumbersTool.check?.(listOf('1,5', '2.5', '3.5'))?.count).toBe(1);
    expect(normalizeNumbersTool.check?.(listOf('1,5', '2,5'))).toBeNull();
    expect(normalizeNumbersTool.check?.(listOf('1,234', '2.5'))).toBeNull();
  });
});
