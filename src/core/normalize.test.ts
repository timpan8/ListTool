import { describe, expect, it } from 'vitest';
import { countKeys, normalizeKey } from './normalize';
import { MESSY_CASE } from '../test/fixtures';
import { splitLines } from './detect';

describe('normalizeKey', () => {
  it('changes nothing when no option is set', () => {
    expect(normalizeKey('  Anna  ')).toBe('  Anna  ');
  });

  it('trims and folds case when asked', () => {
    expect(normalizeKey('  Anna@Example.com ', { trim: true, ignoreCase: true })).toBe(
      'anna@example.com',
    );
  });

  it('matches every spelling in the messy-case fixture', () => {
    const keys = splitLines(MESSY_CASE).map((line) =>
      normalizeKey(line, { trim: true, ignoreCase: true }),
    );
    expect(new Set(keys).size).toBe(1);
  });

  it('collapses runs of whitespace before trimming', () => {
    expect(normalizeKey('Anna    Andersson', { collapseWhitespace: true })).toBe(
      'Anna Andersson',
    );
    expect(normalizeKey('  Anna \t Andersson  ', { collapseWhitespace: true, trim: true })).toBe(
      'Anna Andersson',
    );
  });

  it('keeps Swedish characters distinct unless diacritics are ignored', () => {
    expect(normalizeKey('Åsa', { ignoreCase: true })).not.toBe(normalizeKey('Asa', {}));
    expect(normalizeKey('Åsa', { ignoreCase: true, ignoreDiacritics: true })).toBe('asa');
    expect(normalizeKey('Öberg', { ignoreCase: true, ignoreDiacritics: true })).toBe('oberg');
  });

  it('leaves an empty string empty', () => {
    expect(normalizeKey('   ', { trim: true })).toBe('');
  });
});

describe('countKeys', () => {
  it('counts occurrences', () => {
    expect([...countKeys(['a', 'b', 'a'])]).toEqual([
      ['a', 2],
      ['b', 1],
    ]);
  });

  it('preserves first-seen order', () => {
    expect([...countKeys(['b', 'a', 'b']).keys()]).toEqual(['b', 'a']);
  });

  it('is empty for no keys', () => {
    expect(countKeys([]).size).toBe(0);
  });
});
