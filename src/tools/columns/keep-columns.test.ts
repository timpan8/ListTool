import { describe, expect, it } from 'vitest';
import { keepColumnsTool } from './keep-columns';
import { listOf, tableOf } from '../../test/fixtures';

const table = () => tableOf(['a', 'b', 'c'], [{ a: '1', b: '2', c: '3' }]);

describe('keep columns', () => {
  it('keeps only the chosen columns', () => {
    const output = keepColumnsTool.run(table(), { columns: ['a', 'c'] }).output;
    expect(output.columns.map((column) => column.id)).toEqual(['a', 'c']);
  });

  it('drops the values of the columns it removed', () => {
    const output = keepColumnsTool.run(table(), { columns: ['a'] }).output;
    expect(output.rows[0]?.cells).toEqual({ a: '1' });
  });

  it('keeps the dataset order, not the order they were ticked', () => {
    const output = keepColumnsTool.run(table(), { columns: ['c', 'a'] }).output;
    expect(output.columns.map((column) => column.id)).toEqual(['a', 'c']);
  });

  it('changes nothing until a choice is made', () => {
    const result = keepColumnsTool.run(table(), {});
    expect(result.summary).toBe('Nothing changed.');
    expect(result.output.columns).toHaveLength(3);
  });

  it('changes nothing when every column is kept', () => {
    expect(keepColumnsTool.run(table(), { columns: ['a', 'b', 'c'] }).summary).toBe(
      'Nothing changed.',
    );
  });

  it('refuses to leave a list with no columns', () => {
    const result = keepColumnsTool.run(table(), { columns: ['nope'] });
    expect(result.warnings?.[0]).toBe('Keep at least one column.');
    expect(result.output.columns).toHaveLength(3);
  });

  it('reports what it kept', () => {
    expect(keepColumnsTool.run(table(), { columns: ['a'] }).summary).toBe(
      'Kept 1 column of 3 columns',
    );
  });

  it('gives every row a unique id', () => {
    const wide = tableOf(['a', 'b'], [{ a: '1', b: '2' }, { a: '3', b: '4' }]);
    const rows = keepColumnsTool.run(wide, { columns: ['a'] }).output.rows;
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  });

  it('is hidden on a one-column list', () => {
    expect(keepColumnsTool.appliesTo?.(listOf('a'))).toBe(false);
  });
});
