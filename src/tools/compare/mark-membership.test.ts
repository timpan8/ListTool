import { describe, expect, it } from 'vitest';
import { markMembershipTool } from './mark-membership';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const DEFAULTS = {
  keyA: [VALUE_COLUMN],
  keyB: [VALUE_COLUMN],
  columnName: '',
  yes: 'yes',
  no: '',
  trim: true,
  ignoreCase: true,
  ignoreDiacritics: false,
};

function named(name: string, ...values: string[]) {
  return { ...listOf(...values), id: `d-${name}`, name };
}

describe('mark membership tool', () => {
  it('adds a column saying whether each row is in the second list', () => {
    const output = markMembershipTool.run(
      listOf('a', 'b'),
      DEFAULTS,
      named('B', 'a'),
    ).output;

    expect(output.rows.map((row) => cell(row, 'in'))).toEqual(['yes', '']);
  });

  it('names the column after the second list, so three of them read as a table', () => {
    const list = listOf('a', 'b');
    const withB = markMembershipTool.run(list, DEFAULTS, named('Sales', 'a')).output;
    const withC = markMembershipTool.run(withB, DEFAULTS, named('Support', 'b')).output;

    expect(withC.columns.map((column) => column.name)).toEqual(['Value', 'Sales', 'Support']);
    expect(withC.rows.map((row) => [cell(row, 'in'), cell(row, 'in2')])).toEqual([
      ['yes', ''],
      ['', 'yes'],
    ]);
  });

  it('accepts a name of your own', () => {
    const output = markMembershipTool.run(
      listOf('a'),
      { ...DEFAULTS, columnName: 'On the invite' },
      named('B', 'a'),
    ).output;
    expect(output.columns[1]?.name).toBe('On the invite');
  });

  it('writes whatever words you ask for', () => {
    const output = markMembershipTool.run(
      listOf('a', 'b'),
      { ...DEFAULTS, yes: 'ja', no: 'nej' },
      named('B', 'a'),
    ).output;
    expect(output.rows.map((row) => cell(row, 'in'))).toEqual(['ja', 'nej']);
  });

  it('matches across case and padding', () => {
    const output = markMembershipTool.run(
      listOf(' Anna '),
      DEFAULTS,
      named('B', 'anna'),
    ).output;
    expect(cell(output.rows[0]!, 'in')).toBe('yes');
  });

  it('marks on a compound key', () => {
    const a = tableOf(['first', 'last'], [{ first: 'Anna', last: 'Berg' }]);
    const b = tableOf(['first', 'last'], [{ first: 'anna', last: 'berg' }]);
    const output = markMembershipTool.run(
      a,
      { ...DEFAULTS, keyA: ['first', 'last'], keyB: ['first', 'last'] },
      { ...b, name: 'B' },
    ).output;
    expect(cell(output.rows[0]!, 'in')).toBe('yes');
  });

  it('keeps the row ids, because it only adds a column', () => {
    const list = listOf('a', 'b');
    const output = markMembershipTool.run(list, DEFAULTS, named('B', 'a')).output;
    expect(output.rows.map((row) => row.id)).toEqual(list.rows.map((row) => row.id));
  });

  it('counts what it found', () => {
    const result = markMembershipTool.run(listOf('a', 'b'), DEFAULTS, named('B', 'a'));
    expect(result.summary).toBe('1 of 2 rows are in B');
    expect(result.stats).toEqual({ found: 1, missing: 1 });
  });

  it('warns and changes nothing without a second list', () => {
    const result = markMembershipTool.run(listOf('a'), DEFAULTS);
    expect(result.warnings?.[0]).toBe('Pick a second list to compare with.');
    expect(result.output.columns).toHaveLength(1);
  });

  it('never mutates either list', () => {
    const a = listOf('a');
    const b = named('B', 'a');
    const snapshot = [JSON.stringify(a), JSON.stringify(b)];
    markMembershipTool.run(a, DEFAULTS, b);
    expect([JSON.stringify(a), JSON.stringify(b)]).toEqual(snapshot);
  });
});
