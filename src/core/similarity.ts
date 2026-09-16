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

/** The words of a value in alphabetical order, so word order stops mattering. */
function sortTokens(value: string): string {
  return value
    .split(/\s+/)
    .filter((token) => token !== '')
    .sort()
    .join(' ');
}

/** The same words in another order: "AB Volvo" and "Volvo AB" are the same company. */
export function tokenSortSimilarity(a: string, b: string): number {
  return similarity(sortTokens(a), sortTokens(b));
}

/** The kinder of the two readings, which is what a human comparing them would use. */
export function bestSimilarity(a: string, b: string): number {
  return Math.max(similarity(a, b), tokenSortSimilarity(a, b));
}

/**
 * A 32-bit sketch of which characters a value holds. Two characters may share a bit,
 * which only ever makes the bound below weaker, never wrong.
 */
export function charMask(value: string): number {
  let mask = 0;
  for (let index = 0; index < value.length; index += 1) {
    mask |= 1 << value.charCodeAt(index) % 32;
  }
  return mask;
}

function popcount(bits: number): number {
  let n = bits - ((bits >>> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
  return (((n + (n >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/** The character codes of a value in order, so two bags can be compared in one pass. */
function sortedCodes(value: string): Uint16Array {
  const codes = new Uint16Array(value.length);
  for (let index = 0; index < value.length; index += 1) codes[index] = value.charCodeAt(index);
  return codes.sort();
}

/** How many characters, counted with repeats, one value has that the other lacks. */
function bagDifference(a: Uint16Array, b: Uint16Array): number {
  let i = 0;
  let j = 0;
  let difference = 0;
  while (i < a.length && j < b.length) {
    const x = a[i] ?? 0;
    const y = b[j] ?? 0;
    if (x === y) {
      i += 1;
      j += 1;
    } else {
      difference += 1;
      if (x < y) i += 1;
      else j += 1;
    }
  }
  return difference + (a.length - i) + (b.length - j);
}

/** A value with what the bounds need to know about it, worked out once. */
interface Sketch {
  value: string;
  mask: number;
  codes: Uint16Array;
}

function sketch(value: string): Sketch {
  return { value, mask: charMask(value), codes: sortedCodes(value) };
}

/**
 * Can these two be this alike at all? One edit changes the length by at most one, the
 * set of characters by at most two and the count of characters by at most two, so the
 * distance is at least the largest of those three gaps, halved where it must be. Each
 * bound is cheaper than the next, and most pairs fail one before a single cell of the
 * distance matrix is filled in.
 */
function within(a: Sketch, b: Sketch, threshold: number): boolean {
  const longest = Math.max(a.value.length, b.value.length);
  if (longest === 0) return true;
  // Judged with the very arithmetic `similarity` uses, so a bound can never reject a
  // pair the real distance would accept by a rounding hair.
  const passes = (atLeast: number): boolean => 1 - atLeast / longest >= threshold;
  if (!passes(Math.abs(a.value.length - b.value.length))) return false;
  if (!passes(Math.ceil(popcount(a.mask ^ b.mask) / 2))) return false;
  return passes(Math.ceil(bagDifference(a.codes, b.codes) / 2));
}

/** The bounds alone, for two values: true when nothing rules the pair out yet. */
export function couldBeSimilar(a: string, b: string, threshold: number): boolean {
  return within(sketch(a), sketch(b), threshold);
}

export interface Cluster {
  /** The first value seen in this cluster — the one shown as its name. */
  representative: string;
  values: string[];
}

/** What a representative is compared by: its own text and its word-sorted form. */
interface Representative {
  plain: Sketch;
  sorted: Sketch;
}

function represent(value: string): Representative {
  const plain = sketch(value);
  const sorted = sortTokens(value);
  // One word needs no sorting; the same object says so, and saves the second check.
  return { plain, sorted: sorted === value ? plain : sketch(sorted) };
}

/** True when the value resembles the representative enough, cheapest test first. */
function resembles(home: Representative, value: Representative, threshold: number): boolean {
  if (home.plain.value === value.plain.value) return true;
  if (within(home.plain, value.plain, threshold)) {
    if (similarity(home.plain.value, value.plain.value) >= threshold) return true;
  }
  if (home.sorted === home.plain && value.sorted === value.plain) return false;
  if (home.sorted.value === value.sorted.value) return true;
  if (!within(home.sorted, value.sorted, threshold)) return false;
  return similarity(home.sorted.value, value.sorted.value) >= threshold;
}

/**
 * Greedy single-pass clustering: each value joins the first cluster whose representative
 * it resembles enough, or starts its own. Deterministic, and O(values × clusters) rather
 * than O(values²), which matters once a list is long.
 */
export function clusterValues(values: string[], threshold: number): Cluster[] {
  const clusters: Cluster[] = [];
  const representatives: Representative[] = [];

  for (const value of values) {
    const candidate = represent(value);
    const at = representatives.findIndex((home) => resembles(home, candidate, threshold));
    if (at === -1) {
      clusters.push({ representative: value, values: [value] });
      representatives.push(candidate);
    } else {
      clusters[at]?.values.push(value);
    }
  }

  return clusters;
}
