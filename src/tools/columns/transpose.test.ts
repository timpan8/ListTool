import { describe, expect, it } from 'vitest';
import { transposeTool } from './transpose';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const TABLE = tableOf(
  ['name', 'email'],
  [
    { name: 'Anna', email: 'anna@example.com' },
    { name: 'Bo', email: 'bo@example.com' },
  ],
);

describe('transpose tool', () => {
  it('turns columns into rows and rows into columns', () => {
    const output = transposeTool.run(TABLE, { header: false }).output;

    expect(output.columns.map((column) => column.name)).toEqual(['Field', 'Row 1', 'Row 2']);
    expect(output.rows.map((row) => cell(row, 'field'))).toEqual(['name', 'email']);
    expect(output.rows.map((row) => [cell(row, 'c1'), cell(row, 'c2')])).toEqual([
      ['Anna', 'Bo'],
      ['anna@example.com', 'bo@example.com'],
    ]);
  });

  it('can take the new column names from the first column', () => {
    const output = transposeTool.run(TABLE, { header: true }).output;

    expect(output.columns.map((column) => column.name)).toEqual(['Field', 'Anna', 'Bo']);
    expect(output.rows.map((row) => cell(row, 'field'))).toEqual(['email']);
    expect(cell(output.rows[0]!, 'c1')).toBe('anna@example.com');
  });

  it('turns a one-column list into a single row', () => {
    const output = transposeTool.run(listOf('a', 'b', 'c'), { header: false }).output;
    expect(output.rows).toHaveLength(1);
    expect(output.columns).toHaveLength(4);
  });

  it('comes back to where it started when run twice', () => {
    const once = transposeTool.run(TABLE, { header: false }).output;
    const twice = transposeTool.run(once, { header: true }).output;

    expect(twice.columns.map((column) => column.name)).toEqual(['Field', 'name', 'email']);
    expect(twice.rows.map((row) => [cell(row, 'c1'), cell(row, 'c2')])).toEqual([
      ['Anna', 'anna@example.com'],
      ['Bo', 'bo@example.com'],
    ]);
  });

  it('keeps the list its name and its id', () => {
    const output = transposeTool.run(TABLE, { header: false }).output;
    expect([output.id, output.name]).toEqual([TABLE.id, TABLE.name]);
  });

  it('drops the raw input, which no longer describes the table', () => {
    const output = transposeTool.run(listOf('a', 'b'), { header: false }).output;
    expect(output.rawInput).toBeUndefined();
    expect(output.parse).toBeUndefined();
  });

  it('gives every row and column a unique id', () => {
    const output = transposeTool.run(TABLE, { header: false }).output;
    expect(new Set(output.columns.map((column) => column.id)).size).toBe(3);
    expect(new Set(output.rows.map((row) => row.id)).size).toBe(2);
  });

  it('refuses an empty list rather than producing nonsense', () => {
    const result = transposeTool.run(listOf(), { header: false });
    expect(result.summary).toBe('Nothing changed.');
    expect(result.warnings?.[0]).toBe('There is nothing to transpose.');
  });

  it('says what it did', () => {
    const result = transposeTool.run(TABLE, { header: false });
    expect(result.summary).toBe('Transposed 2 rows into 2 rows');
  });

  it('never mutates its input', () => {
    const before = JSON.stringify(TABLE);
    transposeTool.run(TABLE, { header: true });
    expect(JSON.stringify(TABLE)).toBe(before);
  });
});
