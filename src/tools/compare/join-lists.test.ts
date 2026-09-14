import { describe, expect, it } from 'vitest';
import { joinListsTool } from './join-lists';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const PEOPLE = tableOf(
  ['email', 'name'],
  [
    { email: 'anna@example.com', name: 'Anna' },
    { email: 'bo@example.com', name: 'Bo' },
  ],
);

const DEPARTMENTS = tableOf(
  ['mail', 'dept'],
  [{ mail: 'ANNA@example.com', dept: 'Sales' }],
);

const DEFAULTS = {
  keyA: ['email'],
  keyB: ['mail'],
  bring: ['dept'],
  prefix: '',
  keepUnmatched: true,
  firstMatch: true,
  trim: true,
  ignoreCase: true,
  ignoreDiacritics: false,
};

describe('join lists tool', () => {
  it('brings a column from the second list in beside the matching row', () => {
    const output = joinListsTool.run(PEOPLE, DEFAULTS, DEPARTMENTS).output;

    expect(output.columns.map((column) => column.name)).toEqual(['email', 'name', 'dept']);
    expect(output.rows.map((row) => cell(row, 'dept'))).toEqual(['Sales', '']);
  });

  it('matches across case, like every other comparison here', () => {
    const output = joinListsTool.run(PEOPLE, DEFAULTS, DEPARTMENTS).output;
    expect(cell(output.rows[0]!, 'dept')).toBe('Sales');
  });

  it('can drop the rows that matched nothing', () => {
    const output = joinListsTool.run(
      PEOPLE,
      { ...DEFAULTS, keepUnmatched: false },
      DEPARTMENTS,
    ).output;
    expect(output.rows).toHaveLength(1);
  });

  it('takes the first match by default, or every match when asked', () => {
    const twice = tableOf(
      ['mail', 'dept'],
      [
        { mail: 'anna@example.com', dept: 'Sales' },
        { mail: 'anna@example.com', dept: 'Support' },
      ],
    );

    expect(joinListsTool.run(PEOPLE, DEFAULTS, twice).output.rows).toHaveLength(2);

    const every = joinListsTool.run(PEOPLE, { ...DEFAULTS, firstMatch: false }, twice).output;
    expect(every.rows.map((row) => cell(row, 'dept'))).toEqual(['Sales', 'Support', '']);
  });

  it('gives a brought column a free id when the two lists share a column name', () => {
    const clash = tableOf(['email', 'name'], [{ email: 'anna@example.com', name: 'Ekonomi' }]);
    const output = joinListsTool.run(
      PEOPLE,
      { ...DEFAULTS, keyB: ['email'], bring: ['name'] },
      clash,
    ).output;

    expect(output.columns.map((column) => column.id)).toEqual(['email', 'name', 'name2']);
    expect([cell(output.rows[0]!, 'name'), cell(output.rows[0]!, 'name2')]).toEqual([
      'Anna',
      'Ekonomi',
    ]);
  });

  it('can prefix the brought column names so their origin is visible', () => {
    const output = joinListsTool.run(PEOPLE, { ...DEFAULTS, prefix: 'B: ' }, DEPARTMENTS).output;
    expect(output.columns[2]?.name).toBe('B: dept');
  });

  it('joins on a compound key', () => {
    const a = tableOf(['first', 'last'], [{ first: 'Anna', last: 'Berg' }]);
    const b = tableOf(
      ['first', 'last', 'dept'],
      [{ first: 'anna', last: 'berg', dept: 'Sales' }],
    );
    const output = joinListsTool.run(
      a,
      { ...DEFAULTS, keyA: ['first', 'last'], keyB: ['first', 'last'], bring: ['dept'] },
      b,
    ).output;
    expect(cell(output.rows[0]!, 'dept')).toBe('Sales');
  });

  it('brings every non-key column when nothing was chosen', () => {
    const output = joinListsTool.run(
      PEOPLE,
      { ...DEFAULTS, bring: undefined },
      DEPARTMENTS,
    ).output;
    expect(output.columns.map((column) => column.name)).toEqual(['email', 'name', 'dept']);
  });

  it('refuses to run when every column was unticked', () => {
    const result = joinListsTool.run(PEOPLE, { ...DEFAULTS, bring: [] }, DEPARTMENTS);
    expect(result.warnings?.[0]).toBe('Pick at least one column to bring across.');
    expect(result.output.columns).toHaveLength(2);
  });

  it('reports what matched and warns about what did not', () => {
    const result = joinListsTool.run(PEOPLE, DEFAULTS, DEPARTMENTS);
    expect(result.summary).toBe('Matched 1 of 2 rows, bringing 1 column');
    expect(result.stats).toEqual({ matched: 1, unmatched: 1, rows: 2 });
    expect(result.warnings?.[0]).toBe('1 rows matched nothing.');
  });

  it('warns and changes nothing without a second list', () => {
    const result = joinListsTool.run(listOf('a'), DEFAULTS);
    expect(result.warnings?.[0]).toBe('Pick a second list to compare with.');
  });

  it('gives every output row a unique id', () => {
    const output = joinListsTool.run(PEOPLE, DEFAULTS, DEPARTMENTS).output;
    expect(new Set(output.rows.map((row) => row.id)).size).toBe(2);
  });

  it('never mutates either list', () => {
    const snapshot = [JSON.stringify(PEOPLE), JSON.stringify(DEPARTMENTS)];
    joinListsTool.run(PEOPLE, DEFAULTS, DEPARTMENTS);
    expect([JSON.stringify(PEOPLE), JSON.stringify(DEPARTMENTS)]).toEqual(snapshot);
  });
});
