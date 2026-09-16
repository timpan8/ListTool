import { describe, expect, it } from 'vitest';
import { findReplaceTool } from './find-replace';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

function values(input: string[], options: Record<string, unknown>): string[] {
  return findReplaceTool
    .run(listOf(...input), options)
    .output.rows.map((row) => cell(row, VALUE_COLUMN));
}

describe('find and replace', () => {
  it('replaces every occurrence', () => {
    expect(values(['a-a-a'], { find: '-', replace: '+' })).toEqual(['a+a+a']);
  });

  it('treats the search text literally by default', () => {
    expect(values(['a.b', 'axb'], { find: '.', replace: '-' })).toEqual(['a-b', 'axb']);
  });

  it('treats it as a pattern when asked', () => {
    expect(values(['a1b2'], { find: '\\d', replace: '#', regex: true })).toEqual(['a#b#']);
  });

  it('supports capture groups in the replacement', () => {
    expect(
      values(['Anna Andersson'], { find: '(\\w+) (\\w+)', replace: '$2, $1', regex: true }),
    ).toEqual(['Andersson, Anna']);
  });

  it('ignores case by default, like every other match, and respects it when told to', () => {
    expect(values(['Anna anna'], { find: 'anna', replace: 'X' })).toEqual(['X X']);
    expect(values(['Anna anna'], { find: 'anna', replace: 'X', ignoreCase: false })).toEqual([
      'Anna X',
    ]);
  });

  it('can delete text by replacing with nothing', () => {
    expect(values(['a-b'], { find: '-', replace: '' })).toEqual(['ab']);
  });

  it('reports occurrences and cells separately', () => {
    expect(findReplaceTool.run(listOf('a-a', 'a'), { find: '-', replace: '+' }).summary).toBe(
      'Replaced 1 occurrence in 1 cell',
    );
  });

  it('warns when the search text is empty', () => {
    const result = findReplaceTool.run(listOf('a'), { find: '', replace: 'x' });
    expect(result.warnings?.[0]).toBe('Nothing to find yet.');
    expect(result.summary).toBe('Nothing changed.');
  });

  it('warns and changes nothing on a broken pattern', () => {
    const result = findReplaceTool.run(listOf('a'), { find: '[', replace: 'x', regex: true });
    expect(result.warnings?.[0]).toContain('not a valid regular expression');
    expect(values(['a'], { find: '[', replace: 'x', regex: true })).toEqual(['a']);
  });

  it('works on one column when one is chosen', () => {
    const table = tableOf(['a', 'b'], [{ a: 'x', b: 'x' }]);
    const output = findReplaceTool.run(table, { find: 'x', replace: 'y', column: 'a' }).output;
    expect([cell(output.rows[0]!, 'a'), cell(output.rows[0]!, 'b')]).toEqual(['y', 'x']);
  });
});
