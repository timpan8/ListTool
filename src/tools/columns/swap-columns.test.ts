import { describe, expect, it } from 'vitest';
import { swapColumnsTool } from './swap-columns';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';
import { recipientsParser } from '../../parsers/recipients';
import { OUTLOOK_RECIPIENTS } from '../../test/fixtures';

const table = () =>
  tableOf(
    ['first', 'last'],
    [
      { first: 'Anna', last: 'Andersson' },
      { first: 'Bo', last: 'Berg' },
    ],
  );

describe('swap first/last', () => {
  it('swaps the two columns contents', () => {
    const output = swapColumnsTool.run(table(), { columnA: 'first', columnB: 'last' }).output;
    expect(output.rows.map((row) => cell(row, 'first'))).toEqual(['Andersson', 'Berg']);
    expect(output.rows.map((row) => cell(row, 'last'))).toEqual(['Anna', 'Bo']);
  });

  it('leaves the columns where they are', () => {
    const output = swapColumnsTool.run(table(), { columnA: 'first', columnB: 'last' }).output;
    expect(output.columns.map((column) => column.id)).toEqual(['first', 'last']);
  });

  it('fixes a wrong name order straight out of the Recipients parser', () => {
    const wrong = recipientsParser.parse(OUTLOOK_RECIPIENTS, { nameOrder: 'first-last' });
    const fixed = swapColumnsTool.run(wrong, { columnA: 'first', columnB: 'last' }).output;
    expect(fixed.rows.map((row) => [cell(row, 'first'), cell(row, 'last')])).toEqual([
      ['first1', 'last1'],
      ['first2', 'last2'],
      ['first3', 'last3'],
    ]);
  });

  it('warns when both choices are the same column', () => {
    const result = swapColumnsTool.run(table(), { columnA: 'first', columnB: 'first' });
    expect(result.warnings?.[0]).toBe('Pick two different columns.');
    expect(cell(result.output.rows[0]!, 'first')).toBe('Anna');
  });

  it('does not apply to a one-column list', () => {
    expect(swapColumnsTool.appliesTo?.(listOf('a'))).toBe(false);
    expect(swapColumnsTool.appliesTo?.(table())).toBe(true);
  });

  it('reports what it swapped', () => {
    expect(swapColumnsTool.run(table(), { columnA: 'first', columnB: 'last' }).summary).toBe(
      'Swapped first and last in 2 rows',
    );
  });

  it('is its own inverse', () => {
    const once = swapColumnsTool.run(table(), { columnA: 'first', columnB: 'last' }).output;
    const twice = swapColumnsTool.run(once, { columnA: 'first', columnB: 'last' }).output;
    expect(twice.rows.map((row) => cell(row, 'first'))).toEqual(['Anna', 'Bo']);
  });
});
