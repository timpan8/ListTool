import { describe, expect, it } from 'vitest';
import { splitByValueTool } from './split-by-value';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const PEOPLE = tableOf(
  ['name', 'city'],
  [
    { name: 'Anna', city: 'Göteborg' },
    { name: 'Bo', city: 'Stockholm' },
    { name: 'Carl', city: 'göteborg' },
    { name: 'Dora', city: '' },
  ],
);

const BASE = { column: 'city', pattern: '{value}', trim: true, ignoreCase: true };

describe('split into lists by a value', () => {
  it('leaves the first group in place and opens the rest as further lists', () => {
    const result = splitByValueTool.run(PEOPLE, BASE);

    expect(result.output.rows.map((row) => cell(row, 'name'))).toEqual(['Anna', 'Carl']);
    expect(result.extraLists?.map((extra) => extra.dataset.rows.map((row) => cell(row, 'name')))).toEqual([
      ['Bo'],
      ['Dora'],
    ]);
  });

  it('names each list from the value, by the first spelling seen', () => {
    const result = splitByValueTool.run(PEOPLE, BASE);
    expect(result.extraLists?.map((extra) => extra.name)).toEqual(['Stockholm', 'Empty']);
  });

  it('accepts a pattern of your own, with the list name in it', () => {
    const result = splitByValueTool.run(
      { ...PEOPLE, name: 'Kunder' },
      { ...BASE, pattern: '{name} — {value}' },
    );
    expect(result.extraLists?.[0]?.name).toBe('Kunder — Stockholm');
  });

  it('groups two spellings of the same value together', () => {
    expect(splitByValueTool.run(PEOPLE, BASE).stats).toEqual({ lists: 3 });
  });

  it('keeps them apart when case is not ignored', () => {
    expect(splitByValueTool.run(PEOPLE, { ...BASE, ignoreCase: false }).stats).toEqual({
      lists: 4,
    });
  });

  it('keeps every row its id, so the preview can say which rows went where', () => {
    const result = splitByValueTool.run(PEOPLE, BASE);
    expect(result.output.rows.map((row) => row.id)).toEqual(['r1', 'r3']);
    expect(result.extraLists?.[0]?.dataset.rows.map((row) => row.id)).toEqual(['r2']);
  });

  it('keeps the columns of the list it split', () => {
    const result = splitByValueTool.run(PEOPLE, BASE);
    expect(result.extraLists?.[0]?.dataset.columns).toEqual(PEOPLE.columns);
  });

  it('does nothing when every row has the same value', () => {
    const same = tableOf(['city'], [{ city: 'Göteborg' }, { city: 'Göteborg' }]);
    const result = splitByValueTool.run(same, BASE);
    expect(result.summary).toBe('Nothing changed.');
    expect(result.warnings?.[0]).toContain('nothing to split');
    expect(result.extraLists).toBeUndefined();
  });

  it('refuses rather than opening thirty-one tabs', () => {
    const many = tableOf(
      ['city'],
      Array.from({ length: 40 }, (_, index) => ({ city: `c${index}` })),
    );
    const result = splitByValueTool.run(many, BASE);
    expect(result.warnings?.[0]).toContain('40 different values');
    expect(result.extraLists).toBeUndefined();
  });

  it('says what it split', () => {
    expect(splitByValueTool.run(PEOPLE, BASE).summary).toBe('Split 4 rows into 3 lists');
  });

  it('handles an empty list', () => {
    expect(splitByValueTool.run(listOf(), { ...BASE, column: '' }).summary).toBe(
      'Nothing changed.',
    );
  });

  it('never mutates its input', () => {
    const before = JSON.stringify(PEOPLE);
    splitByValueTool.run(PEOPLE, BASE);
    expect(JSON.stringify(PEOPLE)).toBe(before);
  });
});
