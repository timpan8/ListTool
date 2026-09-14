import { describe, expect, it } from 'vitest';
import { buildDisplayNameTool } from './build-display-name';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const table = () =>
  tableOf(
    ['first', 'last'],
    [
      { first: 'Anna', last: 'Andersson' },
      { first: '', last: 'Berg' },
    ],
  );

function display(options: Record<string, unknown>): string[] {
  return buildDisplayNameTool
    .run(table(), options)
    .output.rows.map((row) => cell(row, 'display'));
}

describe('build display name', () => {
  it('writes First Last by default', () => {
    expect(display({})).toEqual(['Anna Andersson', 'Berg']);
  });

  it('writes Last First when asked', () => {
    expect(display({ order: 'last-first' })).toEqual(['Andersson Anna', 'Berg']);
  });

  it('writes Last, First with a comma whatever the separator is', () => {
    expect(display({ order: 'last-comma-first', separator: ' ' })).toEqual([
      'Andersson, Anna',
      'Berg',
    ]);
  });

  it('leaves no dangling separator when a half is missing', () => {
    expect(display({})[1]).toBe('Berg');
  });

  it('keeps the original columns and adds one', () => {
    const output = buildDisplayNameTool.run(table(), {}).output;
    expect(output.columns.map((column) => column.id)).toEqual(['first', 'last', 'display']);
  });

  it('is hidden on a one-column list', () => {
    expect(buildDisplayNameTool.appliesTo?.(listOf('a'))).toBe(false);
  });
});
