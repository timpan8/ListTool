import { describe, expect, it } from 'vitest';
import {
  bestSimilarity,
  clusterValues,
  editDistance,
  similarity,
  tokenSortSimilarity,
} from './similarity';

describe('editDistance', () => {
  it('is zero for identical strings', () => {
    expect(editDistance('anna', 'anna')).toBe(0);
  });

  it('counts a substitution, an insertion and a deletion as one each', () => {
    expect(editDistance('anna', 'anne')).toBe(1);
    expect(editDistance('ann', 'anna')).toBe(1);
    expect(editDistance('anna', 'ann')).toBe(1);
  });

  it('falls back to the other string length when one side is empty', () => {
    expect(editDistance('', 'anna')).toBe(4);
    expect(editDistance('anna', '')).toBe(4);
    expect(editDistance('', '')).toBe(0);
  });

  it('is symmetric', () => {
    expect(editDistance('Andersson', 'Anderson')).toBe(editDistance('Anderson', 'Andersson'));
  });

  it('counts Swedish characters as single characters', () => {
    expect(editDistance('Åsa', 'Asa')).toBe(1);
  });
});

describe('similarity', () => {
  it('is 1 for identical values and for two empty ones', () => {
    expect(similarity('anna', 'anna')).toBe(1);
    expect(similarity('', '')).toBe(1);
  });

  it('is 0 when nothing at all matches', () => {
    expect(similarity('abc', 'xyz')).toBe(0);
  });

  it('scales by the longer string, so one typo matters less in a long value', () => {
    expect(similarity('ab', 'ac')).toBeCloseTo(0.5);
    expect(similarity('anna.andersson', 'anna.anderssen')).toBeGreaterThan(0.9);
  });
});

describe('tokenSortSimilarity', () => {
  it('sees the same words in another order as the same value', () => {
    expect(tokenSortSimilarity('AB Volvo', 'Volvo AB')).toBe(1);
  });

  it('ignores repeated whitespace between the words', () => {
    expect(tokenSortSimilarity('Anna   Andersson', 'Andersson Anna')).toBe(1);
  });

  it('still separates genuinely different words', () => {
    expect(tokenSortSimilarity('AB Volvo', 'AB Saab')).toBeLessThan(0.8);
  });
});

describe('bestSimilarity', () => {
  it('takes the kinder of the two readings', () => {
    expect(bestSimilarity('AB Volvo', 'Volvo AB')).toBe(1);
    expect(bestSimilarity('anna', 'anne')).toBe(similarity('anna', 'anne'));
  });
});

describe('clusterValues', () => {
  it('puts near-spellings together and keeps the first as the name', () => {
    const clusters = clusterValues(['Andersson', 'Anderson', 'Berg'], 0.8);
    expect(clusters).toHaveLength(2);
    expect(clusters[0]).toEqual({ representative: 'Andersson', values: ['Andersson', 'Anderson'] });
    expect(clusters[1]?.values).toEqual(['Berg']);
  });

  it('leaves everything apart at a threshold of 1 except exact repeats', () => {
    const clusters = clusterValues(['Andersson', 'Anderson', 'Andersson'], 1);
    expect(clusters.map((cluster) => cluster.values)).toEqual([
      ['Andersson', 'Andersson'],
      ['Anderson'],
    ]);
  });

  it('is deterministic: the same input gives the same clusters every time', () => {
    const values = ['anna@example.com', 'anna@exampel.com', 'bo@example.com'];
    expect(clusterValues(values, 0.85)).toEqual(clusterValues(values, 0.85));
  });

  it('handles an empty list and a single value', () => {
    expect(clusterValues([], 0.8)).toEqual([]);
    expect(clusterValues(['x'], 0.8)).toEqual([{ representative: 'x', values: ['x'] }]);
  });

  it('groups empty strings with each other rather than with everything', () => {
    const clusters = clusterValues(['', '', 'anna'], 0.8);
    expect(clusters.map((cluster) => cluster.values)).toEqual([['', ''], ['anna']]);
  });
});
