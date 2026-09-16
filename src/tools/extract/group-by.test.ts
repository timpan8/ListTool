import { describe, expect, it } from 'vitest';
import { groupByTool } from './group-by';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const SALES = tableOf(
  ['city', 'amount'],
  [
    { city: 'Göteborg', amount: '100' },
    { city: 'Stockholm', amount: '250' },
    { city: 'göteborg', amount: '50' },
    { city: 'Stockholm', amount: '250' },
  ],
);

const DEFAULTS = {
  column: 'city',
  valueColumn: 'amount',
  separator: ', ',
  trim: true,
  ignoreCase: true,
};

function results(how: string, options: Record<string, unknown> = {}) {
  const output = groupByTool.run(SALES, { ...DEFAULTS, how, ...options }).output;
  return output.rows.map((row) => [cell(row, 'group'), cell(row, 'result')]);
}

describe('group by tool', () => {
  it('counts the rows of each group', () => {
    expect(results('count')).toEqual([
      ['Göteborg', '2'],
      ['Stockholm', '2'],
    ]);
  });

  it('sums, averages, and finds the smallest and largest', () => {
    expect(results('sum')).toEqual([
      ['Göteborg', '150'],
      ['Stockholm', '500'],
    ]);
    expect(results('average')).toEqual([
      ['Göteborg', '75'],
      ['Stockholm', '250'],
    ]);
    expect(results('min')[0]).toEqual(['Göteborg', '50']);
    expect(results('max')[0]).toEqual(['Göteborg', '100']);
  });

  it('lists the values of a group when asked to', () => {
    expect(results('join')[0]).toEqual(['Göteborg', '100, 50']);
  });

  it('names the group by the first spelling seen, not the last', () => {
    expect(results('count')[0]?.[0]).toBe('Göteborg');
  });

  it('keeps spellings apart when case is not ignored', () => {
    expect(results('count', { ignoreCase: false })).toHaveLength(3);
  });

  it('names the result column after what it did', () => {
    const output = groupByTool.run(SALES, { ...DEFAULTS, how: 'sum' }).output;
    expect(output.columns.map((column) => column.name)).toEqual(['city', 'Sum']);
  });

  it('reads a decimal comma as a decimal point', () => {
    const dataset = tableOf(['g', 'v'], [{ g: 'a', v: '1,5' }, { g: 'a', v: '2,5' }]);
    const output = groupByTool.run(dataset, {
      ...DEFAULTS,
      column: 'g',
      valueColumn: 'v',
      how: 'sum',
    }).output;
    expect(cell(output.rows[0]!, 'result')).toBe('4');
  });

  it('reads thousands separators without turning them into decimals', () => {
    const dataset = tableOf(['g', 'v'], [{ g: 'a', v: '1 000' }, { g: 'a', v: '1,234.50' }]);
    const output = groupByTool.run(dataset, {
      ...DEFAULTS,
      column: 'g',
      valueColumn: 'v',
      how: 'sum',
    }).output;
    expect(cell(output.rows[0]!, 'result')).toBe('2234.5');
  });

  it('shortens a repeating average instead of printing sixteen decimals', () => {
    const dataset = tableOf(
      ['g', 'v'],
      [{ g: 'a', v: '1' }, { g: 'a', v: '1' }, { g: 'a', v: '2' }],
    );
    const output = groupByTool.run(dataset, {
      ...DEFAULTS,
      column: 'g',
      valueColumn: 'v',
      how: 'average',
    }).output;
    expect(cell(output.rows[0]!, 'result')).toBe('1.333333');
  });

  it('warns about values that were not numbers rather than counting them as zero', () => {
    const dataset = tableOf(['g', 'v'], [{ g: 'a', v: '10' }, { g: 'a', v: 'n/a' }]);
    const result = groupByTool.run(dataset, {
      ...DEFAULTS,
      column: 'g',
      valueColumn: 'v',
      how: 'sum',
    });
    expect(cell(result.output.rows[0]!, 'result')).toBe('10');
    expect(result.warnings?.[0]).toBe(
      '1 value was not a number and was left out of the calculation.',
    );
  });

  it('leaves the result empty when a group has no numbers at all', () => {
    const dataset = tableOf(['g', 'v'], [{ g: 'a', v: 'n/a' }]);
    const output = groupByTool.run(dataset, {
      ...DEFAULTS,
      column: 'g',
      valueColumn: 'v',
      how: 'sum',
    }).output;
    expect(cell(output.rows[0]!, 'result')).toBe('');
  });

  it('counts a one-column list against itself', () => {
    const result = groupByTool.run(listOf('a', 'b', 'a'), { ...DEFAULTS, column: '', how: 'count' });
    expect(result.output.rows.map((row) => cell(row, 'result'))).toEqual(['2', '1']);
    expect(result.summary).toBe('2 groups from 3 rows');
  });

  it('handles an empty list', () => {
    const result = groupByTool.run(listOf(), { ...DEFAULTS, column: '', how: 'count' });
    expect(result.output.rows).toEqual([]);
    expect(result.summary).toBe('0 groups from 0 rows');
  });

  it('never mutates its input', () => {
    const before = JSON.stringify(SALES);
    groupByTool.run(SALES, { ...DEFAULTS, how: 'sum' });
    expect(JSON.stringify(SALES)).toBe(before);
  });
});
