import { describe, expect, it } from 'vitest';
import { columnProfiles, numericColumns, profileColumns, TOP_VALUES } from './profile';
import { VALUE_COLUMN } from './model';
import { listOf, tableOf } from '../test/fixtures';

describe('profileColumns', () => {
  it('counts what is filled and what is empty', () => {
    const profile = profileColumns(listOf('a', '', '  ', 'b'))[0];
    expect(profile).toMatchObject({ filled: 2, empty: 2, unique: 2 });
  });

  it('measures the shortest and longest value in characters, ignoring padding', () => {
    const profile = profileColumns(listOf('  ab  ', 'abcd'))[0];
    expect([profile?.shortest, profile?.longest]).toEqual([2, 4]);
  });

  it('counts a Swedish character as one character, not two', () => {
    expect(profileColumns(listOf('Åsa'))[0]?.longest).toBe(3);
  });

  it('reports zero lengths rather than Infinity for an empty column', () => {
    const profile = profileColumns(listOf('', ''))[0];
    expect([profile?.shortest, profile?.longest]).toEqual([0, 0]);
  });

  it('groups values case-insensitively but shows the first spelling seen', () => {
    const profile = profileColumns(listOf('Anna', 'anna', 'ANNA'))[0];
    expect(profile?.unique).toBe(1);
    expect(profile?.top).toEqual([{ value: 'Anna', count: 3 }]);
  });

  it('puts the commonest value first', () => {
    const profile = profileColumns(listOf('b', 'a', 'a'))[0];
    expect(profile?.top.map((entry) => entry.value)).toEqual(['a', 'b']);
  });

  it('breaks a tie by first appearance, so the order never wobbles', () => {
    const profile = profileColumns(listOf('b', 'a'))[0];
    expect(profile?.top.map((entry) => entry.value)).toEqual(['b', 'a']);
  });

  it('keeps only the most common values', () => {
    const values = Array.from({ length: TOP_VALUES + 5 }, (_, index) => `v${index}`);
    expect(profileColumns(listOf(...values))[0]?.top).toHaveLength(TOP_VALUES);
    expect(profileColumns(listOf(...values), 3)[0]?.top).toHaveLength(3);
  });

  it('profiles every column of a table separately', () => {
    const dataset = tableOf(
      ['first', 'email'],
      [
        { first: 'Anna', email: 'anna@example.com' },
        { first: 'Anna', email: '' },
      ],
    );
    const profiles = profileColumns(dataset);
    expect(profiles.map((profile) => profile.column.id)).toEqual(['first', 'email']);
    expect(profiles[0]).toMatchObject({ filled: 2, unique: 1 });
    expect(profiles[1]).toMatchObject({ filled: 1, empty: 1, unique: 1 });
  });

  it('handles a list with no rows at all', () => {
    const profile = profileColumns(listOf())[0];
    expect(profile).toMatchObject({ filled: 0, empty: 0, unique: 0, top: [] });
  });

  it('never mutates the dataset it reads', () => {
    const dataset = listOf('a', 'b');
    const before = JSON.stringify(dataset);
    profileColumns(dataset);
    expect(JSON.stringify(dataset)).toBe(before);
  });
});

describe('numericColumns', () => {
  it('finds the columns that read as numbers, in every shape people write them', () => {
    const dataset = tableOf(
      ['name', 'amount', 'postcode', 'phone'],
      [
        { name: 'Anna', amount: '1 234,50', postcode: '412 50', phone: '070-123 45 67' },
        { name: 'Bo', amount: '-12', postcode: '11122', phone: '08-123 456' },
        { name: 'Carl', amount: '99 kr', postcode: '', phone: '' },
      ],
    );
    expect([...numericColumns(dataset)].sort()).toEqual(['amount', 'postcode']);
  });

  it('forgives a stray non-number, but not a column that is mostly text', () => {
    const mostly = listOf('1', '2', '3', '4', 'n/a');
    expect(numericColumns(mostly).has(VALUE_COLUMN)).toBe(true);
    const mixed = listOf('1', '2', 'three', 'four');
    expect(numericColumns(mixed).has(VALUE_COLUMN)).toBe(false);
  });

  it('never calls an empty column numeric', () => {
    expect(numericColumns(listOf('', '')).size).toBe(0);
  });

  it('answers the same set for the same dataset object', () => {
    const dataset = listOf('1', '2');
    expect(numericColumns(dataset)).toBe(numericColumns(dataset));
  });
});

describe('columnProfiles', () => {
  it('is the profile with the usual top values, remembered per dataset', () => {
    const dataset = listOf('a', 'a', 'b');
    expect(columnProfiles(dataset)).toBe(columnProfiles(dataset));
    expect(columnProfiles(dataset)[0]?.top[0]).toEqual({ value: 'a', count: 2 });
  });
});
