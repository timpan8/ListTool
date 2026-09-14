import { describe, expect, it } from 'vitest';
import { moveColumnTool } from './move-column';
import { listOf, tableOf } from '../../test/fixtures';

const table = () => tableOf(['a', 'b', 'c'], [{ a: '1', b: '2', c: '3' }]);

function ids(options: Record<string, unknown>): string[] {
  return moveColumnTool.run(table(), options).output.columns.map((column) => column.id);
}

describe('move column', () => {
  it('moves one left', () => {
    expect(ids({ column: 'b', direction: 'left' })).toEqual(['b', 'a', 'c']);
  });

  it('moves one right', () => {
    expect(ids({ column: 'b', direction: 'right' })).toEqual(['a', 'c', 'b']);
  });

  it('warns at the left edge', () => {
    const result = moveColumnTool.run(table(), { column: 'a', direction: 'left' });
    expect(result.warnings?.[0]).toContain('already as far as it goes');
    expect(result.output.columns.map((column) => column.id)).toEqual(['a', 'b', 'c']);
  });

  it('warns at the right edge', () => {
    const result = moveColumnTool.run(table(), { column: 'c', direction: 'right' });
    expect(result.warnings?.[0]).toContain('already as far as it goes');
  });

  it('leaves the values where they belong', () => {
    const output = moveColumnTool.run(table(), { column: 'c', direction: 'left' }).output;
    expect(output.rows[0]?.cells).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('is hidden on a one-column list', () => {
    expect(moveColumnTool.appliesTo?.(listOf('a'))).toBe(false);
  });
});
