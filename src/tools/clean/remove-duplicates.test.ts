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

describe('choosing which duplicate survives', () => {
  const PEOPLE = tableOf(
    ['email', 'name', 'updated'],
    [
      { email: 'anna@example.com', name: 'Anna', updated: '2024-01-01' },
      { email: 'ANNA@example.com', name: '', updated: '2026-05-05' },
      { email: 'anna@example.com', name: 'Anna Andersson', updated: '2025-02-02' },
      { email: 'bo@example.com', name: 'Bo', updated: '2024-03-03' },
    ],
  );

  function kept(options: Record<string, unknown>): string[] {
    return removeDuplicatesTool
      .run(PEOPLE, { column: 'email', trim: true, ignoreCase: true, ...options })
      .output.rows.map((row) => cell(row, 'updated'));
  }

  it('keeps the first of each set by default', () => {
    expect(kept({ keep: 'first' })).toEqual(['2024-01-01', '2024-03-03']);
  });

  it('keeps the last of each set', () => {
    expect(kept({ keep: 'last' })).toEqual(['2025-02-02', '2024-03-03']);
  });

  it('keeps the row with the fewest empty cells', () => {
    expect(kept({ keep: 'fullest' })).toEqual(['2024-01-01', '2024-03-03']);
  });

  it('keeps the largest value in a chosen column, which is how you keep the newest', () => {
    expect(kept({ keep: 'largest', keepColumn: 'updated' })).toEqual([
      '2026-05-05',
      '2024-03-03',
    ]);
  });

  it('keeps the smallest value in a chosen column', () => {
    expect(kept({ keep: 'smallest', keepColumn: 'updated' })).toEqual([
      '2024-01-01',
      '2024-03-03',
    ]);
  });

  it('reads the deciding column as a number when it is one', () => {
    const scores = tableOf(
      ['id', 'score'],
      [
        { id: 'a', score: '9' },
        { id: 'a', score: '10' },
      ],
    );
    const output = removeDuplicatesTool.run(scores, {
      column: 'id',
      keep: 'largest',
      keepColumn: 'score',
    }).output;
    expect(cell(output.rows[0]!, 'score')).toBe('10');
  });

  it('keeps the earlier row when the deciding values tie', () => {
    const tied = tableOf(
      ['id', 'score'],
      [
        { id: 'a', score: '1' },
        { id: 'a', score: '1' },
      ],
    );
    const output = removeDuplicatesTool.run(tied, {
      column: 'id',
      keep: 'largest',
      keepColumn: 'score',
    }).output;
    expect(output.rows[0]?.id).toBe('r1');
  });

  it('keeps the rows in the order the list had them, whichever one won', () => {
    const output = removeDuplicatesTool.run(PEOPLE, {
      column: 'email',
      keep: 'last',
    }).output;
    expect(output.rows.map((row) => cell(row, 'email'))).toEqual([
      'anna@example.com',
      'bo@example.com',
    ]);
  });

  it('falls back to the first column when none was chosen to decide', () => {
    expect(() =>
      removeDuplicatesTool.run(PEOPLE, { column: 'email', keep: 'largest', keepColumn: '' }),
    ).not.toThrow();
  });
});
