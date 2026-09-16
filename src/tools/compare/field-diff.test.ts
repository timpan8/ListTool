import { describe, expect, it } from 'vitest';
import { fieldDiffTool } from './field-diff';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const BEFORE = tableOf(
  ['email', 'name', 'city'],
  [
    { email: 'anna@example.com', name: 'Anna', city: 'Göteborg' },
    { email: 'bo@example.com', name: 'Bo', city: 'Stockholm' },
    { email: 'carl@example.com', name: 'Carl', city: 'Malmö' },
  ],
);

const AFTER = tableOf(
  ['email', 'name', 'city'],
  [
    { email: 'ANNA@example.com', name: 'Anna Andersson', city: 'Göteborg' },
    { email: 'bo@example.com', name: 'Bo', city: '' },
  ],
);

const BASE = {
  keyA: ['email'],
  keyB: ['email'],
  onlyFilled: false,
  trim: true,
  ignoreCase: true,
  ignoreDiacritics: false,
};

function diffs(options: Record<string, unknown> = {}) {
  const output = fieldDiffTool.run(BEFORE, { ...BASE, ...options }, AFTER).output;
  return output.rows.map((row) => [
    cell(row, 'key'),
    cell(row, 'field'),
    cell(row, 'a'),
    cell(row, 'b'),
  ]);
}

describe('field diff tool', () => {
  it('reports one row per field that differs', () => {
    expect(diffs()).toEqual([
      ['anna@example.com', 'name', 'Anna', 'Anna Andersson'],
      ['bo@example.com', 'city', 'Stockholm', ''],
    ]);
  });

  it('says nothing about rows that match nothing on the other side', () => {
    expect(diffs().every((row) => row[0] !== 'carl@example.com')).toBe(true);
  });

  it('matches keys the way every other comparison here does', () => {
    // anna is ANNA on the other side, and still the same person.
    expect(diffs()[0]?.[0]).toBe('anna@example.com');
  });

  it('never reports the key column as a difference', () => {
    expect(diffs().some((row) => row[1] === 'email')).toBe(false);
  });

  it('can skip a difference where one side is empty', () => {
    expect(diffs({ onlyFilled: true })).toEqual([
      ['anna@example.com', 'name', 'Anna', 'Anna Andersson'],
    ]);
  });

  it('compares only the columns chosen', () => {
    expect(diffs({ compare: ['city'] })).toEqual([
      ['bo@example.com', 'city', 'Stockholm', ''],
    ]);
  });

  it('compares on a compound key', () => {
    const a = tableOf(['first', 'last', 'city'], [{ first: 'Anna', last: 'Berg', city: 'x' }]);
    const b = tableOf(['first', 'last', 'city'], [{ first: 'anna', last: 'berg', city: 'y' }]);
    const output = fieldDiffTool.run(
      a,
      { ...BASE, keyA: ['first', 'last'], keyB: ['first', 'last'] },
      b,
    ).output;
    expect(cell(output.rows[0]!, 'key')).toBe('Anna Berg');
  });

  it('counts the differences and the rows it matched', () => {
    const result = fieldDiffTool.run(BEFORE, BASE, AFTER);
    expect(result.summary).toBe('2 differences across 2 matching rows');
    expect(result.stats).toEqual({ changes: 2, matched: 2, unmatched: 1 });
  });

  it('warns about the rows that matched nothing', () => {
    const result = fieldDiffTool.run(BEFORE, BASE, AFTER);
    expect(result.warnings).toContain('1 row of this list matched nothing in the second.');
  });

  it('says so plainly when the matching rows are identical', () => {
    const result = fieldDiffTool.run(BEFORE, BASE, BEFORE);
    expect(result.output.rows).toEqual([]);
    expect(result.warnings?.[0]).toContain('identical');
  });

  it('refuses when the two lists share no column to compare', () => {
    const other = tableOf(['email', 'dept'], [{ email: 'anna@example.com', dept: 'Sales' }]);
    const result = fieldDiffTool.run(
      tableOf(['email'], [{ email: 'anna@example.com' }]),
      BASE,
      other,
    );
    expect(result.warnings?.[0]).toBe('The two lists have no column in common to compare.');
  });

  it('warns and changes nothing without a second list', () => {
    const result = fieldDiffTool.run(listOf('a'), BASE);
    expect(result.warnings?.[0]).toBe('Pick a second list to compare with.');
  });

  it('never mutates either list', () => {
    const snapshot = [JSON.stringify(BEFORE), JSON.stringify(AFTER)];
    fieldDiffTool.run(BEFORE, BASE, AFTER);
    expect([JSON.stringify(BEFORE), JSON.stringify(AFTER)]).toEqual(snapshot);
  });
});
