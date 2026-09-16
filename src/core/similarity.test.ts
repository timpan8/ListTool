import { describe, expect, it } from 'vitest';
import {
  bestSimilarity,
  charMask,
  clusterValues,
  couldBeSimilar,
  editDistance,
  similarity,
  tokenSortSimilarity,
  type Cluster,
} from './similarity';

/** A small deterministic generator that stays inside 32 bits. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Surname-like words from few syllables: they share most letters, which is the hard case. */
function syllableNames(count: number, seed = 11): string[] {
  const parts = ['an', 'ders', 'berg', 'lund', 'ström', 'kvist', 'son', 'gren', 'holm', 'sten'];
  const next = random(seed);
  const seen = new Set<string>();
  while (seen.size < count) {
    const pieces = 2 + Math.floor(next() * 2);
    let name = '';
    for (let i = 0; i < pieces; i += 1) name += parts[Math.floor(next() * parts.length)] ?? '';
    seen.add(`${name}${seen.size}`);
  }
  return [...seen];
}

/** The same greedy pass with no bounds at all: what the fast one must agree with. */
function clusterSlowly(values: string[], threshold: number): Cluster[] {
  const clusters: Cluster[] = [];
  for (const value of values) {
    const home = clusters.find(
      (cluster) => bestSimilarity(cluster.representative, value) >= threshold,
    );
    if (home === undefined) clusters.push({ representative: value, values: [value] });
    else home.values.push(value);
  }
  return clusters;
}

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

  it('gives exactly the answer the unbounded pass gives, at every threshold', () => {
    const values = [
      ...syllableNames(300),
      'AB Volvo',
      'Volvo AB',
      'Anna  Andersson',
      'Andersson Anna',
      '',
      'Åsa Öberg',
      'Asa Oberg',
      '12345',
      '54321',
    ];
    for (const threshold of [1, 0.9, 0.8, 0.7, 0.5, 0]) {
      expect(clusterValues(values, threshold), String(threshold)).toEqual(
        clusterSlowly(values, threshold),
      );
    }
  });

  it('stays quick on thousands of distinct values that share their letters', () => {
    const values = syllableNames(5000);
    const started = performance.now();
    const clusters = clusterValues(values, 0.7);
    // Well under a second here; the budget leaves room for a slow build machine.
    expect(performance.now() - started).toBeLessThan(5000);
    expect(clusters.length).toBeGreaterThan(1000);
  });
});

describe('couldBeSimilar', () => {
  it('rules a pair out on length alone', () => {
    expect(couldBeSimilar('anna', 'anna andersson', 0.9)).toBe(false);
    expect(couldBeSimilar('anna', 'anne', 0.7)).toBe(true);
  });

  it('rules a pair out on the characters they do not share', () => {
    expect(couldBeSimilar('abcdefghij', 'klmnopqrst', 0.5)).toBe(false);
    expect(couldBeSimilar('aaaaaaaaaa', 'aaaaaaaaab', 0.9)).toBe(true);
  });

  it('rules a pair out on the counts, not only the set, of characters', () => {
    // Same letters, very different counts: the set bound passes, the bag bound does not.
    expect(couldBeSimilar('aaaaaaaaab', 'abbbbbbbbb', 0.9)).toBe(false);
  });

  it('never rules out a pair that is in fact alike', () => {
    const values = syllableNames(200, 3);
    for (let i = 0; i < values.length; i += 1) {
      for (let j = 0; j < i; j += 1) {
        const a = values[i] ?? '';
        const b = values[j] ?? '';
        if (similarity(a, b) >= 0.7) expect(couldBeSimilar(a, b, 0.7), `${a} ${b}`).toBe(true);
      }
    }
  });

  it('treats two empty values as alike', () => {
    expect(couldBeSimilar('', '', 1)).toBe(true);
  });
});

describe('charMask', () => {
  it('sets a bit per character and is order-blind', () => {
    expect(charMask('abc')).toBe(charMask('cba'));
    expect(charMask('abc')).not.toBe(charMask('abd'));
    expect(charMask('')).toBe(0);
  });
});
