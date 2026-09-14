import { describe, expect, it } from 'vitest';
import { prefixSuffixTool } from './prefix-suffix';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf } from '../../test/fixtures';

function values(input: string[], options: Record<string, unknown>): string[] {
  return prefixSuffixTool
    .run(listOf(...input), options)
    .output.rows.map((row) => cell(row, VALUE_COLUMN));
}

describe('add prefix / suffix', () => {
  it('adds both', () => {
    expect(values(['a'], { prefix: '<', suffix: '>' })).toEqual(['<a>']);
  });

  it('adds only a prefix', () => {
    expect(values(['a'], { prefix: 'x-' })).toEqual(['x-a']);
  });

  it('adds only a suffix', () => {
    expect(values(['a'], { suffix: '@example.com' })).toEqual(['a@example.com']);
  });

  it('leaves an empty value empty rather than wrapping nothing', () => {
    expect(values(['a', ''], { prefix: "'", suffix: "'" })).toEqual(["'a'", '']);
  });

  it('warns when neither is given', () => {
    const result = prefixSuffixTool.run(listOf('a'), {});
    expect(result.warnings?.[0]).toBe('No prefix or suffix given, so nothing changed.');
  });

  it('reports what it wrapped', () => {
    expect(prefixSuffixTool.run(listOf('a', 'b'), { prefix: 'x' }).summary).toBe(
      'Wrapped 2 cells',
    );
  });
});
