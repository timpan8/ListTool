import { describe, expect, it } from 'vitest';
import { filterRulesTool } from './filter-rules';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const PEOPLE = tableOf(
  ['name', 'email', 'city'],
  [
    { name: 'Anna', email: 'anna@example.com', city: 'Göteborg' },
    { name: 'Bo', email: '', city: 'Göteborg' },
    { name: 'Carl', email: 'carl@other.example', city: 'Stockholm' },
    { name: 'Dora', email: 'dora@example.com', city: 'Stockholm' },
  ],
);

const BASE = { match: 'all', ignoreCase: true, invert: false };

function names(options: Record<string, unknown>): string[] {
  return filterRulesTool
    .run(PEOPLE, { ...BASE, ...options })
    .output.rows.map((row) => cell(row, 'name'));
}

describe('filter on several rules', () => {
  it('keeps the rows every rule matches', () => {
    expect(
      names({
        column: 'city',
        mode: 'equals',
        pattern: 'Stockholm',
        column2: 'email',
        mode2: 'contains',
        pattern2: '@example.com',
      }),
    ).toEqual(['Dora']);
  });

  it('keeps the rows any rule matches', () => {
    expect(
      names({
        match: 'any',
        column: 'name',
        mode: 'equals',
        pattern: 'Anna',
        column2: 'city',
        mode2: 'equals',
        pattern2: 'Stockholm',
      }),
    ).toEqual(['Anna', 'Carl', 'Dora']);
  });

  it('ignores a rule with no text, so one rule behaves like the simple filter', () => {
    expect(names({ column: 'city', mode: 'equals', pattern: 'Göteborg' })).toEqual([
      'Anna',
      'Bo',
    ]);
  });

  it('uses all three rules when all three are filled', () => {
    const result = filterRulesTool.run(PEOPLE, {
      ...BASE,
      match: 'any',
      column: 'name',
      pattern: 'Anna',
      column2: 'name',
      pattern2: 'Bo',
      column3: 'name',
      pattern3: 'Carl',
    });
    expect(result.stats?.['rules']).toBe(3);
    expect(result.output.rows).toHaveLength(3);
  });

  it('turns the whole result around when inverted', () => {
    expect(names({ column: 'city', mode: 'equals', pattern: 'Göteborg', invert: true })).toEqual(
      ['Carl', 'Dora'],
    );
  });

  it('searches every column when a rule names none', () => {
    expect(names({ column: '', mode: 'contains', pattern: 'example.com' })).toEqual([
      'Anna',
      'Dora',
    ]);
  });

  it('matches across case by default and exactly when told to', () => {
    expect(names({ column: 'name', mode: 'equals', pattern: 'anna' })).toEqual(['Anna']);
    expect(names({ column: 'name', mode: 'equals', pattern: 'anna', ignoreCase: false })).toEqual(
      [],
    );
  });

  it('takes a regular expression in any rule', () => {
    expect(names({ column: 'email', mode: 'regex', pattern: '@other\\.' })).toEqual(['Carl']);
  });

  it('refuses a broken regular expression rather than filtering on nothing', () => {
    const result = filterRulesTool.run(PEOPLE, {
      ...BASE,
      column: 'email',
      mode: 'regex',
      pattern: '([',
    });
    expect(result.output.rows).toHaveLength(4);
    expect(result.warnings?.[0]).toContain('not a valid regular expression');
  });

  it('asks for a rule rather than emptying the list', () => {
    const result = filterRulesTool.run(PEOPLE, BASE);
    expect(result.summary).toBe('Nothing changed.');
    expect(result.warnings?.[0]).toBe('Type the text for at least one rule.');
  });

  it('says how many rules it used', () => {
    const result = filterRulesTool.run(PEOPLE, {
      ...BASE,
      column: 'city',
      pattern: 'Göteborg',
      column2: 'name',
      pattern2: 'Anna',
    });
    expect(result.summary).toBe('Kept 1 of 4 rows, on 2 rules');
  });

  it('handles an empty list', () => {
    expect(filterRulesTool.run(listOf(), { ...BASE, pattern: 'x' }).output.rows).toEqual([]);
  });

  it('never mutates its input', () => {
    const before = JSON.stringify(PEOPLE);
    filterRulesTool.run(PEOPLE, { ...BASE, column: 'name', pattern: 'Anna' });
    expect(JSON.stringify(PEOPLE)).toBe(before);
  });
});
