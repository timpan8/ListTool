import type { Dataset } from './model';

/**
 * Remember one answer per dataset. A dataset is an immutable value — every tool, every
 * edit and every undo produces a new object — so its identity is a correct cache key,
 * and a WeakMap lets old snapshots go with their history. The checkup, the column
 * profile and the numeric-column detection all run once per list instead of once per
 * render, which is what keeps a 10 000-row list from stuttering when a panel opens.
 */
export function memoByDataset<T>(compute: (dataset: Dataset) => T): (dataset: Dataset) => T {
  const cache = new WeakMap<Dataset, T>();
  return (dataset) => {
    if (cache.has(dataset)) return cache.get(dataset) as T;
    const value = compute(dataset);
    cache.set(dataset, value);
    return value;
  };
}
