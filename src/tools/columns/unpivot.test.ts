import { describe, expect, it } from 'vitest';
import { unpivotTool } from './unpivot';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const MONTHS = tableOf(
  ['city', 'jan', 'feb'],
  [
    { city: 'Göteborg', jan: '10', feb: '20' },
    { city: 'Stockholm', jan: '30', feb: '' },
  ],
);

const BASE = { nameColumn: 'Field', valueColumn: 'Value', dropEmpty: true };

function rows(options: Record<string, unknown> = {}) {
  const output = unpivotTool.run(MONTHS, { ...BASE, keep: ['city'], ...options }).output;
  return output.rows.map((row) => [
    cell(row, 'city'),
    cell(row, 'field'),
    cell(row, 'value'),
  ]);
}

describe('unpivot tool', () => {
  it('turns a column per month into one row per month', () => {
    expect(rows()).toEqual([
      ['Göteborg', 'jan', '10'],
      ['Göteborg', 'feb', '20'],
      ['Stockholm', 'jan', '30'],
    ]);
  });

  it('keeps the columns it was told to keep, repeated beside every new row', () => {
    const output = unpivotTool.run(MONTHS, { ...BASE, keep: ['city'] }).output;
    expect(output.columns.map((column) => column.name)).toEqual(['city', 'Field', 'Value']);
  });

  it('skips empty values by default and keeps them when asked', () => {
    expect(rows()).toHaveLength(3);
    expect(rows({ dropEmpty: false })).toHaveLength(4);
  });

  it('names the two new columns whatever you call them', () => {
    const output = unpivotTool.run(MONTHS, {
      ...BASE,
      keep: ['city'],
      nameColumn: 'Månad',
      valueColumn: 'Antal',
    }).output;
    expect(output.columns.map((column) => column.name)).toEqual(['city', 'Månad', 'Antal']);
  });

  it('keeps more than one column when told to', () => {
    const wide = tableOf(['a', 'b', 'jan'], [{ a: '1', b: '2', jan: '3' }]);
    const output = unpivotTool.run(wide, { ...BASE, keep: ['a', 'b'] }).output;
    expect(output.columns.map((column) => column.id)).toEqual(['a', 'b', 'field', 'value']);
    expect(output.rows).toHaveLength(1);
  });

  it('keeps the first column when nothing was chosen', () => {
    const result = unpivotTool.run(MONTHS, BASE);
    expect(result.stats).toEqual({ columns: 2, rows: 3 });
  });

  it('refuses when every column is kept, rather than making an empty list', () => {
    const result = unpivotTool.run(MONTHS, { ...BASE, keep: ['city', 'jan', 'feb'] });
    expect(result.summary).toBe('Nothing changed.');
    expect(result.warnings?.[0]).toContain('nothing left to turn into rows');
  });

  it('gives every new row a unique id', () => {
    const output = unpivotTool.run(MONTHS, { ...BASE, keep: ['city'] }).output;
    expect(new Set(output.rows.map((row) => row.id)).size).toBe(3);
  });

  it('is offered only when there is more than one column', () => {
    expect(unpivotTool.appliesTo?.(listOf('a'))).toBe(false);
    expect(unpivotTool.appliesTo?.(MONTHS)).toBe(true);
  });

  it('says what it turned', () => {
    expect(unpivotTool.run(MONTHS, { ...BASE, keep: ['city'] }).summary).toBe(
      'Turned 2 columns into 3 rows',
    );
  });

  it('never mutates its input', () => {
    const before = JSON.stringify(MONTHS);
    unpivotTool.run(MONTHS, { ...BASE, keep: ['city'] });
    expect(JSON.stringify(MONTHS)).toBe(before);
  });
});
