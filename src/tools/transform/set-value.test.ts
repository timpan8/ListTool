import { describe, expect, it } from 'vitest';
import { setValueTool } from './set-value';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const BASE = { rows: [], column: '', value: '' };

describe('set value tool', () => {
  it('writes the value into the ticked rows and leaves the rest alone', () => {
    const output = setValueTool.run(listOf('a', 'b', 'c'), {
      ...BASE,
      rows: ['r1', 'r3'],
      value: 'x',
    }).output;

    expect(output.rows.map((row) => cell(row, VALUE_COLUMN))).toEqual(['x', 'b', 'x']);
  });

  it('writes into one cell, which is what editing a cell in the table does', () => {
    const dataset = tableOf(['first', 'last'], [{ first: 'Anna', last: 'Berg' }]);
    const output = setValueTool.run(dataset, {
      ...BASE,
      rows: ['r1'],
      column: 'last',
      value: 'Ek',
    }).output;

    expect([cell(output.rows[0]!, 'first'), cell(output.rows[0]!, 'last')]).toEqual([
      'Anna',
      'Ek',
    ]);
  });

  it('can clear a cell', () => {
    const output = setValueTool.run(listOf('a'), { ...BASE, rows: ['r1'], value: '' }).output;
    expect(cell(output.rows[0]!, VALUE_COLUMN)).toBe('');
  });

  it('keeps the row ids, so the change is visible as an edit and not as new rows', () => {
    const output = setValueTool.run(listOf('a', 'b'), {
      ...BASE,
      rows: ['r2'],
      value: 'x',
    }).output;
    expect(output.rows.map((row) => row.id)).toEqual(['r1', 'r2']);
  });

  it('does nothing when no row is ticked', () => {
    const result = setValueTool.run(listOf('a'), { ...BASE, value: 'x' });
    expect(result.summary).toBe('Nothing changed.');
    expect(cell(result.output.rows[0]!, VALUE_COLUMN)).toBe('a');
  });

  it('does nothing when the cell already holds that value', () => {
    const result = setValueTool.run(listOf('a'), { ...BASE, rows: ['r1'], value: 'a' });
    expect(result.summary).toBe('Nothing changed.');
  });

  it('ignores a row id that is no longer in the list', () => {
    const result = setValueTool.run(listOf('a'), { ...BASE, rows: ['r9'], value: 'x' });
    expect(result.summary).toBe('Nothing changed.');
  });

  it('says what it wrote, and names an empty value rather than showing a blank', () => {
    expect(
      setValueTool.run(listOf('a', 'b'), { ...BASE, rows: ['r1', 'r2'], value: 'x' }).summary,
    ).toBe('Set 2 cells to x');
    expect(setValueTool.run(listOf('a'), { ...BASE, rows: ['r1'], value: '' }).summary).toBe(
      'Set 1 cell to (empty)',
    );
  });

  it('never mutates its input', () => {
    const dataset = listOf('a');
    const before = JSON.stringify(dataset);
    setValueTool.run(dataset, { ...BASE, rows: ['r1'], value: 'x' });
    expect(JSON.stringify(dataset)).toBe(before);
  });
});
