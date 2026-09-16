import { describe, expect, it } from 'vitest';
import { padTruncateTool } from './pad-truncate';
import { VALUE_COLUMN } from '../../core/model';
import { listOf } from '../../test/fixtures';

const run = (values: string[], options: Record<string, unknown>): string[] =>
  padTruncateTool.run(listOf(...values), options).output.rows.map((row) => row.cells[VALUE_COLUMN] ?? '');

describe('pad or cut to length tool', () => {
  it('pads on the left with zeros by default', () => {
    expect(run(['7', '42', '12345'], { length: 4 })).toEqual(['0007', '0042', '12345']);
  });

  it('pads on the right with the fill given', () => {
    expect(run(['ab'], { mode: 'padEnd', length: 5, fill: '.' })).toEqual(['ab...']);
    expect(run(['ab'], { mode: 'padEnd', length: 5, fill: '' })).toEqual(['ab   ']);
  });

  it('cuts to the length, with or without an ellipsis', () => {
    expect(run(['Andersson'], { mode: 'truncate', length: 5 })).toEqual(['Ander']);
    expect(run(['Andersson'], { mode: 'truncate', length: 5, ellipsis: true })).toEqual(['Ande…']);
    expect(run(['Bo'], { mode: 'truncate', length: 5, ellipsis: true })).toEqual(['Bo']);
  });

  it('counts characters, not code units, so Swedish letters and emoji are one each', () => {
    expect(run(['Åsa'], { length: 5, fill: '-' })).toEqual(['--Åsa']);
    expect(run(['🙂🙂🙂'], { mode: 'truncate', length: 2 })).toEqual(['🙂🙂']);
  });

  it('leaves empty cells empty and hands the list back when nothing changes', () => {
    const input = listOf('', '12345');
    const result = padTruncateTool.run(input, { length: 3 });
    expect(result.output).toBe(input);
    expect(result.summary).toBe('Nothing changed.');
  });

  it('reports how many cells it changed', () => {
    expect(padTruncateTool.run(listOf('1', '2', '333'), { length: 3 }).summary).toBe('Changed 2 cells');
  });
});
