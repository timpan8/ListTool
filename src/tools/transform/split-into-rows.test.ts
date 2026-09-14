import { describe, expect, it } from 'vitest';
import { splitIntoRowsTool } from './split-into-rows';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const DEFAULTS = { column: '', delimiter: ',', trim: true, dropEmpty: true };

function split(values: string[], options: Record<string, unknown> = {}): string[] {
  return splitIntoRowsTool
    .run(listOf(...values), { ...DEFAULTS, ...options })
    .output.rows.map((row) => cell(row, VALUE_COLUMN));
}

describe('split into rows tool', () => {
  it('turns one cell holding several values into several rows', () => {
    expect(split(['a,b,c'])).toEqual(['a', 'b', 'c']);
  });

  it('trims each part and drops the empty ones by default', () => {
    expect(split(['a, b ,,c,'])).toEqual(['a', 'b', 'c']);
  });

  it('can be told to keep the empty parts and the padding', () => {
    expect(split(['a, b,'], { trim: false, dropEmpty: false })).toEqual(['a', ' b', '']);
  });

  it('leaves a row that has nothing to split as one row', () => {
    expect(split(['a', 'b,c'])).toEqual(['a', 'b', 'c']);
  });

  it('keeps a row whose cell was empty rather than quietly dropping it', () => {
    expect(split(['', 'b,c'])).toEqual(['', 'b', 'c']);
  });

  it('repeats the other columns beside every new row', () => {
    const dataset = tableOf(['name', 'tags'], [{ name: 'Anna', tags: 'a;b' }]);
    const output = splitIntoRowsTool.run(dataset, {
      ...DEFAULTS,
      column: 'tags',
      delimiter: ';',
    }).output;

    expect(output.rows.map((row) => [cell(row, 'name'), cell(row, 'tags')])).toEqual([
      ['Anna', 'a'],
      ['Anna', 'b'],
    ]);
  });

  it('gives every new row a unique id', () => {
    const output = splitIntoRowsTool.run(listOf('a,b', 'c,d'), DEFAULTS).output;
    const ids = output.rows.map((row) => row.id);
    expect(new Set(ids).size).toBe(4);
  });

  it('reports nothing changed when no cell contains the delimiter', () => {
    const result = splitIntoRowsTool.run(listOf('a', 'b'), DEFAULTS);
    expect(result.summary).toBe('Nothing changed.');
    expect(result.warnings?.[0]).toContain('No cell');
  });

  it('says what it did', () => {
    const result = splitIntoRowsTool.run(listOf('a,b'), DEFAULTS);
    expect(result.summary).toBe('Split 1 row into 2 rows');
    expect(result.stats).toEqual({ before: 1, after: 2 });
  });

  it('changes nothing with an empty delimiter', () => {
    const result = splitIntoRowsTool.run(listOf('a,b'), { ...DEFAULTS, delimiter: '' });
    expect(result.output.rows).toHaveLength(1);
  });

  it('splits on a newline inside a cell', () => {
    expect(split(['a\nb'], { delimiter: '\n' })).toEqual(['a', 'b']);
  });

  it('never mutates its input', () => {
    const dataset = listOf('a,b');
    const before = JSON.stringify(dataset);
    splitIntoRowsTool.run(dataset, DEFAULTS);
    expect(JSON.stringify(dataset)).toBe(before);
  });
});
