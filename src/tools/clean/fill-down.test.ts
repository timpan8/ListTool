import { describe, expect, it } from 'vitest';
import { fillDownTool } from './fill-down';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const values = (rows: { cells: Record<string, string> }[]): string[] =>
  rows.map((row) => row.cells[VALUE_COLUMN] ?? '');

describe('fill down tool', () => {
  it('gives every empty cell the nearest filled value above it', () => {
    const result = fillDownTool.run(listOf('Göteborg', '', '', 'Malmö', ''), { column: '' });
    expect(values(result.output.rows)).toEqual(['Göteborg', 'Göteborg', 'Göteborg', 'Malmö', 'Malmö']);
    expect(result.summary).toBe('Filled 3 cells');
  });

  it('leaves empty cells above the first filled one alone', () => {
    expect(values(fillDownTool.run(listOf('', 'a', ''), {}).output.rows)).toEqual(['', 'a', 'a']);
  });

  it('fills upwards when asked', () => {
    expect(values(fillDownTool.run(listOf('', 'a', '', 'b'), { direction: 'up' }).output.rows)).toEqual([
      'a',
      'a',
      'b',
      'b',
    ]);
  });

  it('works on one column at a time, and on all of them', () => {
    const table = tableOf(['city', 'note'], [{ city: 'A', note: 'x' }, { city: '', note: '' }]);
    const one = fillDownTool.run(table, { column: 'city' });
    expect(cell(one.output.rows[1]!, 'city')).toBe('A');
    expect(cell(one.output.rows[1]!, 'note')).toBe('');
    const all = fillDownTool.run(table, { column: '' });
    expect(cell(all.output.rows[1]!, 'note')).toBe('x');
  });

  it('keeps the rows that changed nothing as the same objects, and hands back the list when nothing changed', () => {
    const input = listOf('a', 'b');
    const result = fillDownTool.run(input, {});
    expect(result.output).toBe(input);
    expect(result.warnings).toEqual(['No empty cell has a filled one to take from.']);
  });
});
