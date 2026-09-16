import { describe, expect, it } from 'vitest';
import { compareLabels, KEY_FIELDS, NORMALIZE_FIELDS, readCompareOptions } from './shared';
import { listOf, tableOf } from '../../test/fixtures';

const PEOPLE = tableOf(['name', 'email'], [{ name: 'Anna', email: 'anna@example.com' }]);

describe('readCompareOptions', () => {
  it('reads the declared keys that exist on each list', () => {
    const read = readCompareOptions({ keyA: ['name', 'gone'], keyB: ['email'] }, PEOPLE, PEOPLE);
    expect(read.keyA).toEqual(['name']);
    expect(read.keyB).toEqual(['email']);
  });

  it('falls back to the first column when nothing declared exists', () => {
    const read = readCompareOptions({ keyA: ['email'], keyB: ['email'] }, listOf('a'), listOf('b'));
    expect(read.keyA).toEqual(['value']);
    expect(read.keyB).toEqual(['value']);
  });

  it('accepts a key written as one string', () => {
    expect(readCompareOptions({ keyA: 'email', keyB: 'name' }, PEOPLE, PEOPLE)).toMatchObject({
      keyA: ['email'],
      keyB: ['name'],
    });
  });

  it('reads the four matching rules, with their defaults', () => {
    expect(readCompareOptions({}, PEOPLE, PEOPLE).normalize).toEqual({
      trim: true,
      ignoreCase: true,
      collapseWhitespace: false,
      ignoreDiacritics: false,
    });
    expect(
      readCompareOptions({ collapseWhitespace: true, ignoreCase: false }, PEOPLE, PEOPLE).normalize,
    ).toMatchObject({ collapseWhitespace: true, ignoreCase: false });
  });
});

describe('the shared fields', () => {
  it('ask which columns to match on, defaulting to the email column', () => {
    expect(KEY_FIELDS.map((field) => field.key)).toEqual(['keyA', 'keyB']);
    for (const field of KEY_FIELDS) {
      expect(field.type).toBe('columns');
      expect(field.label).toBe('Match on');
      expect(field.type === 'columns' && field.default).toEqual(['email']);
    }
    expect(KEY_FIELDS[1]?.type === 'columns' && KEY_FIELDS[1].from).toBe('second');
  });

  it('offer the same four rules in the same order', () => {
    expect(NORMALIZE_FIELDS.map((field) => field.key)).toEqual([
      'trim',
      'ignoreCase',
      'collapseWhitespace',
      'ignoreDiacritics',
    ]);
  });
});

describe('compareLabels', () => {
  const labels = compareLabels({ ...listOf('a'), name: 'Kunder' }, { ...listOf('a'), name: 'Leads' });

  it('names the lists in the statuses and the count columns', () => {
    const base = { key: 'k', a: 'a', b: 'a', rowsA: [], rowsB: [] };
    expect(labels.statusText({ ...base, countA: 1, countB: 1, status: 'match' })).toBe('✓ In both');
    expect(labels.statusText({ ...base, countA: 1, countB: 0, status: 'only-a' })).toBe(
      '← Only in Kunder',
    );
    expect(labels.statusText({ ...base, countA: 0, countB: 1, status: 'only-b' })).toBe(
      '→ Only in Leads',
    );
    expect(labels.statusText({ ...base, countA: 2, countB: 1, status: 'count-differs' })).toBe(
      '≠ 2 in Kunder, 1 in Leads',
    );
    expect(labels.countA).toBe('Count in Kunder');
    expect(labels.countB).toBe('Count in Leads');
  });
});
