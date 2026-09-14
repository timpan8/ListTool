/**
 * Similarity for finding near-duplicates. Matching in this app is normally exact —
 * SPEC §6 is explicit that fuzzy is never the default — so everything here is only ever
 * reached by a tool the user chose on purpose, and only ever suggests.
 */

/** Levenshtein distance, two rows at a time so a long list does not need a full matrix. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      const insertion = (current[j - 1] ?? 0) + 1;
      const deletion = (previous[j] ?? 0) + 1;
      current[j] = Math.min(substitution, insertion, deletion);
    }
    previous = current;
  }

  return previous[b.length] ?? 0;
}

/** 1 for identical, 0 for nothing in common. */
export function similarity(a: string, b: string): number {
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 1;
  return 1 - editDistance(a, b) / longest;
}

/** The same words in another order: "AB Volvo" and "Volvo AB" are the same company. */
export function tokenSortSimilarity(a: string, b: string): number {
  const sortTokens = (value: string): string =>
    value.split(/\s+/).filter((token) => token !== '').sort().join(' ');
  return similarity(sortTokens(a), sortTokens(b));
}

/** The kinder of the two readings, which is what a human comparing them would use. */
export function bestSimilarity(a: string, b: string): number {
  return Math.max(similarity(a, b), tokenSortSimilarity(a, b));
}

export interface Cluster {
  /** The first value seen in this cluster — the one shown as its name. */
  representative: string;
  values: string[];
}

/**
 * Greedy single-pass clustering: each value joins the first cluster whose representative
 * it resembles enough, or starts its own. Deterministic, and O(values × clusters) rather
 * than O(values²), which matters once a list is long.
 */
export function clusterValues(values: string[], threshold: number): Cluster[] {
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
