import { cell, type Column, type Dataset } from './model';
import { normalizeKey, type NormalizeOptions } from './normalize';

export interface ValueCount {
  value: string;
  count: number;
}

export interface ColumnProfile {
  column: Column;
  filled: number;
  empty: number;
  unique: number;
  shortest: number;
  longest: number;
  /** Most common values first, ties broken by first appearance. */
  top: ValueCount[];
}

/** How many of the most common values a profile carries. */
export const TOP_VALUES = 8;

const PROFILE_NORMALIZE: NormalizeOptions = { trim: true, ignoreCase: true };

/**
 * What is actually in each column: how much is filled, how much repeats, and what the
 * commonest values are. The status bar answers this for the whole list; a list is usually
 * wrong in one column, and this is how you find which.
 */
export function profileColumns(dataset: Dataset, limit = TOP_VALUES): ColumnProfile[] {
  return dataset.columns.map((column) => {
    const counts = new Map<string, ValueCount>();
    let filled = 0;
    let shortest = Number.POSITIVE_INFINITY;
    let longest = 0;

    for (const row of dataset.rows) {
      const value = cell(row, column.id);
      const trimmed = value.trim();
      if (trimmed === '') continue;

      filled += 1;
      const length = [...trimmed].length;
      shortest = Math.min(shortest, length);
      longest = Math.max(longest, length);

      // Grouped case-insensitively, but shown as the first spelling seen.
      const key = normalizeKey(value, PROFILE_NORMALIZE);
      const seen = counts.get(key);
      if (seen === undefined) counts.set(key, { value: trimmed, count: 1 });
      else seen.count += 1;
    }

    const top = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit);

    return {
      column,
      filled,
      empty: dataset.rows.length - filled,
      unique: counts.size,
      shortest: filled === 0 ? 0 : shortest,
      longest,
      top,
    };
  });
}
