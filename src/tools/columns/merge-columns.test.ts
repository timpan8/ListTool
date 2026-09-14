import { describe, expect, it } from 'vitest';
import { mergeColumnsTool } from './merge-columns';
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

describe('merge columns', () => {
  it('joins two columns into a new one', () => {
    const output = mergeColumnsTool.run(table(), { columnA: 'first', columnB: 'last' }).output;
    expect(output.rows.map((row) => cell(row, 'first_last'))).toEqual([
      'Anna Andersson',
      'Berg',
    ]);
  });

  it('leaves no dangling separator when one half is empty', () => {
    const output = mergeColumnsTool.run(table(), { columnA: 'first', columnB: 'last' }).output;
    expect(cell(output.rows[1]!, 'first_last')).toBe('Berg');
  });

  it('uses the separator it is given', () => {
    const output = mergeColumnsTool.run(table(), {
      columnA: 'first',
      columnB: 'last',
      separator: ', ',
    }).output;
    expect(cell(output.rows[0]!, 'first_last')).toBe('Anna, Andersson');
  });

  it('takes a name when one is typed', () => {
    const output = mergeColumnsTool.run(table(), {
      columnA: 'first',
      columnB: 'last',
      name: 'Full name',
    }).output;
    expect(output.columns[2]?.name).toBe('Full name');
  });

  it('keeps the original columns', () => {
    const output = mergeColumnsTool.run(table(), { columnA: 'first', columnB: 'last' }).output;
    expect(output.columns.map((column) => column.id)).toEqual(['first', 'last', 'first_last']);
  });

  it('warns when both choices are the same column', () => {
    const result = mergeColumnsTool.run(table(), { columnA: 'first', columnB: 'first' });
    expect(result.warnings?.[0]).toBe('Pick two different columns.');
  });

  it('does not apply to a one-column list', () => {
    expect(mergeColumnsTool.appliesTo?.(listOf('a'))).toBe(false);
  });
});
