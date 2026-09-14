import { describe, expect, it } from 'vitest';
import { removeDuplicatesTool } from './remove-duplicates';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

function values(input: string[], options = {}): string[] {
  return removeDuplicatesTool
    .run(listOf(...input), options)
    .output.rows.map((row) => cell(row, VALUE_COLUMN));
}

describe('remove duplicates', () => {
  it('keeps the first occurrence', () => {
    expect(values(['b', 'a', 'b', 'c', 'a'])).toEqual(['b', 'a', 'c']);
  });

  it('reports what it removed', () => {
    expect(removeDuplicatesTool.run(listOf('a', 'a', 'b'), {}).summary).toBe(
      'Removed 1 duplicate (3 rows → 2 rows)',
    );
  });

  it('says so when everything is already unique', () => {
    expect(removeDuplicatesTool.run(listOf('a', 'b'), {}).summary).toBe('Nothing changed.');
  });

  it('ignores case and surrounding space by default', () => {
    expect(values(['Anna', ' anna ', 'ANNA'])).toEqual(['Anna']);
  });

  it('keeps the displayed value of the first occurrence, not the normalized key', () => {
    expect(values(['  Anna  ', 'anna'])).toEqual(['  Anna  ']);
  });

  it('respects case when ignoreCase is off', () => {
    expect(values(['Anna', 'anna'], { ignoreCase: false })).toEqual(['Anna', 'anna']);
  });

  it('keeps Åsa and Asa apart unless diacritics are ignored', () => {
    expect(values(['Åsa', 'Asa'])).toEqual(['Åsa', 'Asa']);
    expect(values(['Åsa', 'Asa'], { ignoreDiacritics: true })).toEqual(['Åsa']);
  });

  it('compares whole rows by default', () => {
    const table = tableOf(
      ['first', 'email'],
      [
        { first: 'Anna', email: 'a@example.com' },
        { first: 'Anna', email: 'b@example.com' },
      ],
    );
    expect(removeDuplicatesTool.run(table, {}).output.rows).toHaveLength(2);
  });

  it('compares one column when a key column is chosen', () => {
    const table = tableOf(
      ['first', 'email'],
      [
        { first: 'Anna', email: 'a@example.com' },
        { first: 'Anna', email: 'b@example.com' },
      ],
    );
    const output = removeDuplicatesTool.run(table, { column: 'first' }).output;
    expect(output.rows).toHaveLength(1);
    expect(cell(output.rows[0]!, 'email')).toBe('a@example.com');
  });

  it('treats several blanks as one value', () => {
    expect(values(['a', '', '  ', 'b'])).toEqual(['a', '', 'b']);
  });

  it('handles an empty list', () => {
    expect(values([])).toEqual([]);
  });
});
