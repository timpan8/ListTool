import { describe, expect, it } from 'vitest';
import { headerRowTool } from './header-row';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const RAW = tableOf(
  ['c1', 'c2'],
  [
    { c1: 'Namn', c2: 'E-post' },
    { c1: 'Anna', c2: 'anna@example.com' },
    { c1: 'Bo', c2: 'bo@example.com' },
  ],
);

describe('header row tool', () => {
  it('takes the column names from the first row', () => {
    const output = headerRowTool.run(RAW, { mode: 'promote' }).output;
    expect(output.columns.map((column) => column.name)).toEqual(['Namn', 'E-post']);
    expect(output.rows).toHaveLength(2);
    expect(cell(output.rows[0]!, 'c1')).toBe('Anna');
  });

  it('keeps the column ids, so tool options and recipes still point at them', () => {
    const output = headerRowTool.run(RAW, { mode: 'promote' }).output;
    expect(output.columns.map((column) => column.id)).toEqual(['c1', 'c2']);
  });

  it('numbers a column the first row left blank', () => {
    const gap = tableOf(['c1', 'c2'], [{ c1: 'Namn', c2: '  ' }, { c1: 'Anna', c2: 'x' }]);
    const output = headerRowTool.run(gap, { mode: 'promote' }).output;
    expect(output.columns.map((column) => column.name)).toEqual(['Namn', 'Column 2']);
  });

  it('trims a name the first row padded', () => {
    const padded = tableOf(['c1'], [{ c1: '  Namn  ' }, { c1: 'Anna' }]);
    expect(headerRowTool.run(padded, { mode: 'promote' }).output.columns[0]?.name).toBe('Namn');
  });

  it('refuses when there is no first row to take', () => {
    const result = headerRowTool.run(listOf(), { mode: 'promote' });
    expect(result.summary).toBe('Nothing changed.');
    expect(result.warnings?.[0]).toBe('There is no first row to take the names from.');
  });

  it('puts the names back as a row', () => {
    const named = tableOf(['c1'], [{ c1: 'Anna' }]);
    const output = headerRowTool.run(
      { ...named, columns: [{ id: 'c1', name: 'Namn' }] },
      { mode: 'demote' },
    ).output;

    expect(output.rows).toHaveLength(2);
    expect(cell(output.rows[0]!, 'c1')).toBe('Namn');
    expect(cell(output.rows[1]!, 'c1')).toBe('Anna');
  });

  it('numbers the columns after demoting, so the same text is not in two places', () => {
    const named = { ...tableOf(['c1'], [{ c1: 'Anna' }]), columns: [{ id: 'c1', name: 'Namn' }] };
    expect(headerRowTool.run(named, { mode: 'demote' }).output.columns[0]?.name).toBe('Column 1');
  });

  it('comes back to where it started when run both ways', () => {
    const promoted = headerRowTool.run(RAW, { mode: 'promote' }).output;
    const back = headerRowTool.run(promoted, { mode: 'demote' }).output;

    expect(back.rows.map((row) => cell(row, 'c1'))).toEqual(['Namn', 'Anna', 'Bo']);
  });

  it('gives every row a unique id after demoting', () => {
    const output = headerRowTool.run(RAW, { mode: 'demote' }).output;
    expect(new Set(output.rows.map((row) => row.id)).size).toBe(4);
  });

  it('says what it did', () => {
    expect(headerRowTool.run(RAW, { mode: 'promote' }).summary).toBe(
      'Took the column names from the first row (3 rows → 2 rows)',
    );
    expect(headerRowTool.run(RAW, { mode: 'demote' }).summary).toBe(
      'Put the column names back as a row (3 rows → 4 rows)',
    );
  });

  it('never mutates its input', () => {
    const before = JSON.stringify(RAW);
    headerRowTool.run(RAW, { mode: 'promote' });
    headerRowTool.run(RAW, { mode: 'demote' });
    expect(JSON.stringify(RAW)).toBe(before);
  });
});
