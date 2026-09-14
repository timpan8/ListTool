import { describe, expect, it } from 'vitest';
import { compareValues, sortBy, sortByLength } from './sort';

const identity = (value: string): string => value;

describe('compareValues', () => {
  it('puts å ä ö after z in Swedish', () => {
    expect(sortBy(['ö', 'z', 'ä', 'a', 'å'], identity)).toEqual(['a', 'z', 'å', 'ä', 'ö']);
  });

  it('puts them among the a-words in English', () => {
    expect(sortBy(['ö', 'z', 'a'], identity, { locale: 'en' })).toEqual(['a', 'ö', 'z']);
  });

  it('sorts numbers naturally by default', () => {
    expect(sortBy(['item10', 'item2', 'item1'], identity)).toEqual([
      'item1',
      'item2',
      'item10',
    ]);
  });

  it('sorts numbers as text when numeric is off', () => {
    expect(sortBy(['item10', 'item2'], identity, { numeric: false })).toEqual([
      'item10',
      'item2',
    ]);
  });

  it('reverses on descending', () => {
    expect(sortBy(['a', 'c', 'b'], identity, { descending: true })).toEqual(['c', 'b', 'a']);
  });

  it('reports equality as 0', () => {
    expect(compareValues('a', 'a')).toBe(0);
  });
});

describe('sortBy', () => {
  it('is stable: equal keys keep their order', () => {
    const rows = [
      { id: 1, key: 'a' },
      { id: 2, key: 'a' },
      { id: 3, key: 'a' },
    ];
    expect(sortBy(rows, (row) => row.key).map((row) => row.id)).toEqual([1, 2, 3]);
  });

  it('is stable when descending too', () => {
    const rows = [
      { id: 1, key: 'a' },
      { id: 2, key: 'a' },
    ];
    expect(sortBy(rows, (row) => row.key, { descending: true }).map((row) => row.id)).toEqual([
      1, 2,
    ]);
  });

  it('never mutates the array it is given', () => {
    const values = ['c', 'a', 'b'];
    sortBy(values, identity);
    expect(values).toEqual(['c', 'a', 'b']);
  });

  it('handles an empty list', () => {
    expect(sortBy([], identity)).toEqual([]);
  });

  it('sorts empty strings first', () => {
    expect(sortBy(['b', '', 'a'], identity)).toEqual(['', 'a', 'b']);
  });
});

describe('sortByLength', () => {
  it('sorts short to long', () => {
    expect(sortByLength(['ccc', 'a', 'bb'], identity)).toEqual(['a', 'bb', 'ccc']);
  });

  it('sorts long to short when descending', () => {
    expect(sortByLength(['a', 'bb'], identity, { descending: true })).toEqual(['bb', 'a']);
  });

  it('counts characters, not UTF-16 units, so an emoji is one character', () => {
    expect(sortByLength(['🙂', 'ab'], identity)).toEqual(['🙂', 'ab']);
  });

  it('is stable for equal lengths', () => {
    const rows = [
      { id: 1, key: 'aa' },
      { id: 2, key: 'bb' },
    ];
    expect(sortByLength(rows, (row) => row.key).map((row) => row.id)).toEqual([1, 2]);
  });
});
