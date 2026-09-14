import { describe, expect, it } from 'vitest';
import { coalesceTool } from './coalesce';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const HERE = tableOf(
  ['email', 'name', 'phone'],
  [
    { email: 'anna@example.com', name: 'Anna', phone: '' },
    { email: 'bo@example.com', name: '', phone: '070-1' },
  ],
);

const THERE = tableOf(
  ['email', 'name', 'phone'],
  [
    { email: 'ANNA@example.com', name: 'Anna Andersson', phone: '070-2' },
    { email: 'bo@example.com', name: 'Bo', phone: '' },
    { email: 'carl@example.com', name: 'Carl', phone: '070-3' },
  ],
);

const BASE = {
  keyA: ['email'],
  keyB: ['email'],
  overwrite: false,
  addMissing: false,
  trim: true,
  ignoreCase: true,
  ignoreDiacritics: false,
};

function rows(options: Record<string, unknown> = {}) {
  const output = coalesceTool.run(HERE, { ...BASE, ...options }, THERE).output;
  return output.rows.map((row) => [cell(row, 'name'), cell(row, 'phone')]);
}

describe('coalesce tool', () => {
  it('fills an empty cell from the matching row of the second list', () => {
    expect(rows()).toEqual([
      ['Anna', '070-2'],
      ['Bo', '070-1'],
    ]);
  });

  it('leaves a cell that already holds something alone', () => {
    expect(rows()[0]?.[0]).toBe('Anna');
  });

  it('can be told to overwrite instead of only filling gaps', () => {
    expect(rows({ overwrite: true })[0]).toEqual(['Anna Andersson', '070-2']);
  });

  it('never replaces something with nothing', () => {
    expect(rows({ overwrite: true })[1]).toEqual(['Bo', '070-1']);
  });

  it('leaves rows that match nothing exactly as they were', () => {
    const alone = tableOf(['email', 'name'], [{ email: 'zoe@example.com', name: '' }]);
    const output = coalesceTool.run(alone, BASE, THERE).output;
    expect(cell(output.rows[0]!, 'name')).toBe('');
  });

  it('can also add the rows only the second list has', () => {
    const output = coalesceTool.run(HERE, { ...BASE, addMissing: true }, THERE).output;
    expect(output.rows.map((row) => cell(row, 'email'))).toEqual([
      'anna@example.com',
      'bo@example.com',
      'carl@example.com',
    ]);
  });

  it('gives an arriving row a fresh id, so no id repeats', () => {
    const output = coalesceTool.run(HERE, { ...BASE, addMissing: true }, THERE).output;
    expect(new Set(output.rows.map((row) => row.id)).size).toBe(3);
  });

  it('fills only the columns chosen', () => {
    expect(rows({ columns: ['phone'] })).toEqual([
      ['Anna', '070-2'],
      ['', '070-1'],
    ]);
  });

  it('keeps the row ids of the rows that were already here', () => {
    const output = coalesceTool.run(HERE, BASE, THERE).output;
    expect(output.rows.slice(0, 2).map((row) => row.id)).toEqual(['r1', 'r2']);
  });

  it('matches on a compound key', () => {
    const a = tableOf(['first', 'last', 'city'], [{ first: 'Anna', last: 'Berg', city: '' }]);
    const b = tableOf(['first', 'last', 'city'], [{ first: 'anna', last: 'berg', city: 'x' }]);
    const output = coalesceTool.run(
      a,
      { ...BASE, keyA: ['first', 'last'], keyB: ['first', 'last'] },
      b,
    ).output;
    expect(cell(output.rows[0]!, 'city')).toBe('x');
  });

  it('says what it filled and what it added', () => {
    const result = coalesceTool.run(HERE, { ...BASE, addMissing: true }, THERE);
    expect(result.summary).toBe('Filled 2 cells, added 1 row');
    expect(result.stats).toEqual({ filled: 2, added: 1 });
  });

  it('says so plainly when there was nothing to take', () => {
    const result = coalesceTool.run(HERE, BASE, HERE);
    expect(result.summary).toBe('Nothing changed.');
    expect(result.warnings?.[0]).toBe('There was nothing to take from the second list.');
  });

  it('warns and changes nothing without a second list', () => {
    expect(coalesceTool.run(listOf('a'), BASE).warnings?.[0]).toBe(
      'Pick a second list to compare with.',
    );
  });

  it('never mutates either list', () => {
    const snapshot = [JSON.stringify(HERE), JSON.stringify(THERE)];
    coalesceTool.run(HERE, { ...BASE, addMissing: true }, THERE);
    expect([JSON.stringify(HERE), JSON.stringify(THERE)]).toEqual(snapshot);
  });
});
