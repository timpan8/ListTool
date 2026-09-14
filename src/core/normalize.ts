/**
 * Normalization builds KEYS for dedupe and compare. Displayed values are never
 * overwritten by it — a normalized key is only ever used to decide what matches what.
 */
export interface NormalizeOptions {
  trim?: boolean;
  ignoreCase?: boolean;
  collapseWhitespace?: boolean;
  ignoreDiacritics?: boolean;
}

export const DEFAULT_NORMALIZE: NormalizeOptions = { trim: true, ignoreCase: true };

/**
 * Diacritics are stripped via NFD, dropping combining marks. Swedish å ä ö therefore
 * fold to a o o — which is why "ignore diacritics" is off by default: it is a matching
 * aid, not a cleanup, and folding it in by default would merge distinct Swedish names.
 */
function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function normalizeKey(value: string, options: NormalizeOptions = {}): string {
  let key = value;
  if (options.collapseWhitespace) key = key.replace(/\s+/g, ' ');
  if (options.trim) key = key.trim();
  if (options.ignoreCase) key = key.toLowerCase();
  if (options.ignoreDiacritics) key = stripDiacritics(key);
  return key;
}

/** Count how often each key occurs, preserving first-seen order. */
export function countKeys(keys: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return counts;
}
