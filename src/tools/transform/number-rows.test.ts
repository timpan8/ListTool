import { describe, expect, it } from 'vitest';
import { numberRowsTool } from './number-rows';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf } from '../../test/fixtures';

describe('number rows', () => {
  it('adds a numbered column at the front', () => {
    const output = numberRowsTool.run(listOf('a', 'b'), {}).output;
    expect(output.columns[0]?.id).toBe('no');
    expect(output.rows.map((row) => cell(row, 'no'))).toEqual(['1', '2']);
  });

  it('starts where it is told to', () => {
    const output = numberRowsTool.run(listOf('a', 'b'), { start: 10 }).output;
    expect(output.rows.map((row) => cell(row, 'no'))).toEqual(['10', '11']);
  });

  it('prepends the number in place when asked', () => {
    const output = numberRowsTool.run(listOf('a', 'b'), { asColumn: false }).output;
    expect(output.columns).toHaveLength(1);
    expect(output.rows.map((row) => cell(row, VALUE_COLUMN))).toEqual(['1. a', '2. b']);
  });

  it('uses the separator it is given', () => {
    const output = numberRowsTool.run(listOf('a'), { asColumn: false, separator: ') ' }).output;
    expect(cell(output.rows[0]!, VALUE_COLUMN)).toBe('1) a');
  });

  it('accepts a numeric string from a number input', () => {
    const output = numberRowsTool.run(listOf('a'), { start: '5' }).output;
    expect(cell(output.rows[0]!, 'no')).toBe('5');
  });

  it('reports what it numbered', () => {
    expect(numberRowsTool.run(listOf('a', 'b'), {}).summary).toBe('Numbered 2 rows');
  });
});
