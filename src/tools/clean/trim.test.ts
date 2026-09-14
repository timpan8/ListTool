import { describe, expect, it } from 'vitest';
import { trimTool } from './trim';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

function values(dataset: ReturnType<typeof listOf>, options = {}): string[] {
  return trimTool.run(dataset, options).output.rows.map((row) => cell(row, VALUE_COLUMN));
}

describe('trim whitespace', () => {
  it('trims both ends', () => {
    expect(values(listOf('  a  ', '\tb\t', 'c'))).toEqual(['a', 'b', 'c']);
  });

  it('counts only the cells it actually changed', () => {
    expect(trimTool.run(listOf('  a  ', 'b'), {}).summary).toBe('Trimmed 1 cell');
  });

  it('says so when nothing changed', () => {
    expect(trimTool.run(listOf('a', 'b'), {}).summary).toBe('Nothing changed.');
  });

  it('leaves whitespace inside the value alone', () => {
    expect(values(listOf('  a  b  '))).toEqual(['a  b']);
  });

  it('works on every column by default', () => {
    const table = tableOf(['first', 'last'], [{ first: ' a ', last: ' b ' }]);
    const output = trimTool.run(table, {}).output;
    expect([cell(output.rows[0]!, 'first'), cell(output.rows[0]!, 'last')]).toEqual(['a', 'b']);
  });

  it('works on one column when one is chosen', () => {
    const table = tableOf(['first', 'last'], [{ first: ' a ', last: ' b ' }]);
    const output = trimTool.run(table, { column: 'first' }).output;
    expect([cell(output.rows[0]!, 'first'), cell(output.rows[0]!, 'last')]).toEqual(['a', ' b ']);
  });

  it('never mutates its input', () => {
    const input = listOf('  a  ');
    const before = JSON.stringify(input);
    trimTool.run(input, {});
    expect(JSON.stringify(input)).toBe(before);
  });

  it('keeps row ids, so identity survives', () => {
    const output = trimTool.run(listOf(' a ', ' b '), {}).output;
    expect(output.rows.map((row) => row.id)).toEqual(['r1', 'r2']);
  });

  it('handles an empty list', () => {
    expect(trimTool.run(listOf(), {}).output.rows).toEqual([]);
  });
});
