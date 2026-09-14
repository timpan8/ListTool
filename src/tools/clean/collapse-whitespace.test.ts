import { describe, expect, it } from 'vitest';
import { collapseWhitespaceTool } from './collapse-whitespace';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf } from '../../test/fixtures';

function values(input: string[]): string[] {
  return collapseWhitespaceTool
    .run(listOf(...input), {})
    .output.rows.map((row) => cell(row, VALUE_COLUMN));
}

describe('collapse whitespace', () => {
  it('turns runs of spaces into one', () => {
    expect(values(['Anna    Andersson'])).toEqual(['Anna Andersson']);
  });

  it('collapses tabs and newlines too', () => {
    expect(values(['a\t\tb', 'c\n\nd'])).toEqual(['a b', 'c d']);
  });

  it('trims the ends as well', () => {
    expect(values(['   a   b   '])).toEqual(['a b']);
  });

  it('leaves an already tidy value alone', () => {
    expect(collapseWhitespaceTool.run(listOf('a b'), {}).summary).toBe('Nothing changed.');
  });

  it('reports what it changed', () => {
    expect(collapseWhitespaceTool.run(listOf('a  b', 'c'), {}).summary).toBe(
      'Collapsed whitespace in 1 cell',
    );
  });
});
