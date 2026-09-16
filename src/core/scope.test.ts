import { describe, expect, it } from 'vitest';
import { runOnRows } from './scope';
import { cell, VALUE_COLUMN } from './model';
import { toolById } from '../tools';
import type { Tool } from '../core/registry';
import { listOf, tableOf } from '../test/fixtures';

const tool = (id: string): Tool => toolById(id) as Tool;
const values = (rows: { cells: Record<string, string> }[]): string[] =>
  rows.map((row) => row.cells[VALUE_COLUMN] ?? '');

describe('runOnRows', () => {
  it('changes only the ticked rows, and leaves the rest where they were', () => {
    const list = listOf(' a ', ' b ', ' c ');
    const result = runOnRows(tool('trim-whitespace'), list, ['r2'], { column: '' });
    expect(result.merged).toBe(true);
    expect(values(result.output.rows)).toEqual([' a ', 'b', ' c ']);
    expect(result.output.rows.map((row) => row.id)).toEqual(['r1', 'r2', 'r3']);
  });

  it('reorders within the ticked slots, the way a spreadsheet sorts a selection', () => {
    const list = listOf('z', 'c', 'x', 'a', 'y');
    const result = runOnRows(tool('sort'), list, ['r2', 'r4'], { column: VALUE_COLUMN });
    expect(values(result.output.rows)).toEqual(['z', 'a', 'x', 'c', 'y']);
  });

  it('removes only ticked rows when the tool removes rows', () => {
    const list = listOf('a', '', 'b', '');
    const result = runOnRows(tool('remove-blank-rows'), list, ['r2', 'r3'], {});
    expect(values(result.output.rows)).toEqual(['a', 'b', '']);
  });

  it('adds a column with the ticked rows filled and the others empty', () => {
    const list = listOf('anna@example.com', 'nope', 'bo@example.com');
    const result = runOnRows(tool('validate-emails'), list, ['r1', 'r2'], {});
    expect(result.merged).toBe(true);
    const valid = result.output.columns[1]?.id as string;
    expect(result.output.rows.map((row) => cell(row, valid))).toEqual(['yes', 'no', '']);
  });

  it('puts rows the tool created after the last ticked slot', () => {
    const list = listOf('a, b', 'c', 'd, e', 'f');
    const result = runOnRows(tool('split-into-rows'), list, ['r1', 'r3'], {
      column: VALUE_COLUMN,
      delimiter: ',',
    });
    expect(values(result.output.rows)).toEqual(['a', 'c', 'd', 'b', 'e', 'f']);
  });

  it('hands the list straight back when the tool had nothing to do', () => {
    const list = listOf('a', 'b');
    const result = runOnRows(tool('trim-whitespace'), list, ['r1'], { column: '' });
    expect(result.output).toBe(list);
    expect(result.merged).toBe(true);
  });

  it('will not merge a tool that reshapes the rows, and says so', () => {
    const list = listOf('a', 'a', 'b');
    const result = runOnRows(tool('count-values'), list, ['r1', 'r2'], {});
    expect(result.merged).toBe(false);
    expect(result.output.rows).toHaveLength(1);
  });

  it('will not merge a tool that opens further lists', () => {
    const list = tableOf(['city'], [{ city: 'A' }, { city: 'B' }, { city: 'C' }]);
    const result = runOnRows(tool('split-by-value'), list, ['r1', 'r2'], { column: 'city' });
    expect(result.merged).toBe(false);
  });

  it('never mutates the list it was given', () => {
    const list = listOf(' a ', 'b');
    const before = JSON.stringify(list);
    runOnRows(tool('trim-whitespace'), list, ['r1'], { column: '' });
    expect(JSON.stringify(list)).toBe(before);
  });
});
