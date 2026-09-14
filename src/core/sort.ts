/**
 * Sorting rules shared by the Sort tool and anything else that needs a stable order.
 * Swedish is the default locale: å ä ö sort after z, which a plain code-point sort
 * gets wrong.
 */
export const DEFAULT_LOCALE = 'sv';

export interface SortOptions {
  locale?: string;
  /** Treat digit runs as numbers, so item2 comes before item10. */
  numeric?: boolean;
  descending?: boolean;
}

export function compareValues(a: string, b: string, options: SortOptions = {}): number {
  const collator = new Intl.Collator(options.locale ?? DEFAULT_LOCALE, {
    numeric: options.numeric ?? true,
    sensitivity: 'variant',
  });
  const result = collator.compare(a, b);
  return options.descending === true ? -result : result;
}

/**
 * A stable sort by a key. Equal keys keep their original order, so sorting twice on
 * two columns gives the obvious result instead of a shuffle.
 */
export function sortBy<T>(items: T[], key: (item: T) => string, options: SortOptions = {}): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const compared = compareValues(key(a.item), key(b.item), options);
      return compared !== 0 ? compared : a.index - b.index;
    })
    .map((entry) => entry.item);
}

/** Sort by how long the value is, ties broken by the value itself. */
export function sortByLength<T>(
  items: T[],
  key: (item: T) => string,
  options: SortOptions = {},
): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const difference = [...key(a.item)].length - [...key(b.item)].length;
      const compared = options.descending === true ? -difference : difference;
      return compared !== 0 ? compared : a.index - b.index;
    })
    .map((entry) => entry.item);
}
