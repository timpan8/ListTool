import { describe, expect, it } from 'vitest';
import { crossTabTool } from './cross-tab';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const SALES = tableOf(
  ['city', 'product', 'amount'],
  [
    { city: 'Göteborg', product: 'Bok', amount: '100' },
    { city: 'Göteborg', product: 'Penna', amount: '50' },
    { city: 'Stockholm', product: 'Bok', amount: '250' },
    { city: 'göteborg', product: 'Bok', amount: '25' },
  ],
);

const BASE = { column: 'city', by: 'product', how: 'count', valueColumn: '', total: true };

function grid(options: Record<string, unknown> = {}) {
  const output = crossTabTool.run(SALES, { ...BASE, ...options }).output;
  return output.rows.map((row) => output.columns.map((column) => cell(row, column.id)));
}

describe('cross-tab tool', () => {
  it('counts rows across two columns', () => {
    expect(grid()).toEqual([
      ['Göteborg', '2', '1', '3'],
      ['Stockholm', '1', '', '1'],
      ['Total', '3', '1', '4'],
    ]);
  });

  it('names the columns after the values across the top', () => {
    const output = crossTabTool.run(SALES, BASE).output;
    expect(output.columns.map((column) => column.name)).toEqual([
      'city',
      'Bok',
      'Penna',
      'Total',
    ]);
  });

  it('totals a column instead of counting rows', () => {
    expect(grid({ how: 'sum', valueColumn: 'amount' })[0]).toEqual([
      'Göteborg',
      '125',
      '50',
      '175',
    ]);
  });

  it('groups two spellings of the same value into one cell', () => {
    expect(grid()).toHaveLength(3);
  });

  it('leaves a cell with nothing in it empty rather than writing a zero', () => {
    expect(grid()[1]?.[2]).toBe('');
  });

  it('can be told to leave the totals out', () => {
    const rows = grid({ total: false });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(['Göteborg', '2', '1']);
  });

  it('warns about values that were not numbers', () => {
    const messy = tableOf(['a', 'b', 'v'], [{ a: 'x', b: 'y', v: 'n/a' }]);
    const result = crossTabTool.run(messy, {
      ...BASE,
      column: 'a',
      by: 'b',
      how: 'sum',
      valueColumn: 'v',
    });
    expect(result.warnings?.[0]).toBe('1 value was not a number and was left out of the totals.');
  });

  it('stops growing columns before the table stops being readable', () => {
    const wide = tableOf(
      ['a', 'b'],
      Array.from({ length: 60 }, (_, index) => ({ a: 'x', b: `v${index}` })),
    );
    const result = crossTabTool.run(wide, { ...BASE, column: 'a', by: 'b' });
    expect(result.stats?.['columns']).toBe(40);
    expect(result.warnings?.[0]).toContain('60 different values');
  });

  it('stops growing rows before the summary is longer than the list', () => {
    const tall = tableOf(
      ['a', 'b'],
      Array.from({ length: 520 }, (_, index) => ({ a: `r${index}`, b: 'x' })),
    );
    const result = crossTabTool.run(tall, { ...BASE, column: 'a', by: 'b' });
    expect(result.stats?.['rows']).toBe(500);
    expect(result.warnings?.[0]).toBe(
      'That column has 520 different values, so only the first 500 became rows.',
    );
    // The total row counts what was shown, and the label column is still first.
    expect(result.output.rows).toHaveLength(501);
    expect(cell(result.output.rows[500]!, 'label')).toBe('Total');
    expect(cell(result.output.rows[500]!, 'c1')).toBe('500');
  });

  it('offers the same four matching rules as every other key-based tool, last', () => {
    expect(crossTabTool.options.slice(-4).map((field) => field.key)).toEqual([
      'trim',
      'ignoreCase',
      'collapseWhitespace',
      'ignoreDiacritics',
    ]);
  });

  it('keeps two spellings apart when told to respect case', () => {
    expect(grid({ ignoreCase: false })).toHaveLength(4);
  });

  it('keeps the list it summarised as the same tab', () => {
    const output = crossTabTool.run(SALES, BASE).output;
    expect(output.id).toBe(SALES.id);
    expect(output.name).toBe(SALES.name);
  });

  it('names an empty value rather than showing a blank heading', () => {
    const gaps = tableOf(['a', 'b'], [{ a: '', b: '' }]);
    const output = crossTabTool.run(gaps, { ...BASE, column: 'a', by: 'b' }).output;
    expect(output.columns[1]?.name).toBe('(empty)');
    expect(cell(output.rows[0]!, 'label')).toBe('(empty)');
  });

  it('says how big the result is', () => {
    expect(crossTabTool.run(SALES, BASE).summary).toBe('2 rows by 2 columns');
  });

  it('is offered only when there are two columns to cross', () => {
    expect(crossTabTool.appliesTo?.(listOf('a'))).toBe(false);
    expect(crossTabTool.appliesTo?.(SALES)).toBe(true);
  });

  it('handles an empty list', () => {
    const empty = { ...SALES, rows: [] };
    const result = crossTabTool.run(empty, BASE);
    expect(result.output.rows).toEqual([]);
    expect(result.summary).toBe('0 rows by 0 columns');
  });

  it('never mutates its input', () => {
    const before = JSON.stringify(SALES);
    crossTabTool.run(SALES, BASE);
    expect(JSON.stringify(SALES)).toBe(before);
  });
});
