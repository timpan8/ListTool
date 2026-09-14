import { describe, expect, it } from 'vitest';
import { appendRowsTool } from './append-rows';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const BY_NAME = { byName: true };

describe('append rows tool', () => {
  it('puts the second list after this one', () => {
    const output = appendRowsTool.run(listOf('a', 'b'), BY_NAME, listOf('c')).output;
    expect(output.rows.map((row) => cell(row, VALUE_COLUMN))).toEqual(['a', 'b', 'c']);
  });

  it('gives every row a unique id, including the ones that arrived', () => {
    const output = appendRowsTool.run(listOf('a', 'b'), BY_NAME, listOf('c', 'd')).output;
    expect(output.rows.map((row) => row.id)).toEqual(['r1', 'r2', 'r3', 'r4']);
  });

  it('lines the columns up by id', () => {
    const a = tableOf(['first', 'email'], [{ first: 'Anna', email: 'anna@example.com' }]);
    const b = tableOf(['first', 'email'], [{ first: 'Bo', email: 'bo@example.com' }]);
    const output = appendRowsTool.run(a, BY_NAME, b).output;

    expect(output.columns).toHaveLength(2);
    expect(output.rows.map((row) => cell(row, 'first'))).toEqual(['Anna', 'Bo']);
  });

  it('lines them up by name when the ids differ', () => {
    const a = tableOf(['c1', 'c2'], [{ c1: 'Anna', c2: 'anna@example.com' }]);
    const b = {
      ...tableOf(['x', 'y'], [{ x: 'Bo', y: 'bo@example.com' }]),
      columns: [
        { id: 'x', name: 'c1' },
        { id: 'y', name: 'c2' },
      ],
    };
    const output = appendRowsTool.run(a, BY_NAME, b).output;

    expect(output.columns).toHaveLength(2);
    expect(output.rows.map((row) => cell(row, 'c1'))).toEqual(['Anna', 'Bo']);
  });

  it('can be told not to match by name', () => {
    const a = tableOf(['c1'], [{ c1: 'Anna' }]);
    const b = { ...tableOf(['x'], [{ x: 'Bo' }]), columns: [{ id: 'x', name: 'c1' }] };
    const output = appendRowsTool.run(a, { byName: false }, b).output;

    expect(output.columns.map((column) => column.id)).toEqual(['c1', 'x']);
    expect(output.rows.map((row) => [cell(row, 'c1'), cell(row, 'x')])).toEqual([
      ['Anna', ''],
      ['', 'Bo'],
    ]);
  });

  it('adds a column the second list has and this one does not, rather than losing it', () => {
    const a = tableOf(['name'], [{ name: 'Anna' }]);
    const b = tableOf(['name', 'dept'], [{ name: 'Bo', dept: 'Sales' }]);
    const result = appendRowsTool.run(a, BY_NAME, b);

    expect(result.output.columns.map((column) => column.name)).toEqual(['name', 'dept']);
    expect(result.output.rows.map((row) => cell(row, 'dept'))).toEqual(['', 'Sales']);
    expect(result.warnings?.[0]).toBe(
      '1 columns of the second list had no match here and were added.',
    );
  });

  it('leaves a cell this list has no value for empty', () => {
    const a = tableOf(['name', 'dept'], [{ name: 'Anna', dept: 'Sales' }]);
    const b = tableOf(['name'], [{ name: 'Bo' }]);
    const output = appendRowsTool.run(a, BY_NAME, b).output;
    expect(output.rows.map((row) => cell(row, 'dept'))).toEqual(['Sales', '']);
  });

  it('does nothing when the second list is empty', () => {
    const result = appendRowsTool.run(listOf('a'), BY_NAME, listOf());
    expect(result.summary).toBe('Nothing changed.');
  });

  it('warns and changes nothing without a second list', () => {
    const result = appendRowsTool.run(listOf('a'), BY_NAME);
    expect(result.warnings?.[0]).toBe('Pick a second list to compare with.');
  });

  it('says what it added', () => {
    const result = appendRowsTool.run(listOf('a'), BY_NAME, listOf('b', 'c'));
    expect(result.summary).toBe('Added 2 rows (1 row → 3 rows)');
    expect(result.stats).toEqual({ added: 2, columns: 0 });
  });

  it('never mutates either list', () => {
    const a = listOf('a');
    const b = listOf('b');
    const snapshot = [JSON.stringify(a), JSON.stringify(b)];
    appendRowsTool.run(a, BY_NAME, b);
    expect([JSON.stringify(a), JSON.stringify(b)]).toEqual(snapshot);
  });
});
