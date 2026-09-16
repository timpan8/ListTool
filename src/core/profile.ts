import { memoByDataset } from './memo';
import { cell, type Column, type Dataset } from './model';
import { normalizeKey, type NormalizeOptions } from './normalize';
import { parseNumber } from './number';

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

/** The profile with the usual number of top values, computed once per dataset. */
export const columnProfiles = memoByDataset((dataset) => profileColumns(dataset));

/** How much of a column must read as numbers before the table treats it as numbers. */
export const NUMERIC_SHARE = 0.8;

/**
 * The columns that hold numbers, so the table can right-align them the way a spreadsheet
 * does. A column counts when at least NUMERIC_SHARE of its filled cells parse — a stray
 * "n/a" does not turn a column of amounts back into text. Once per dataset.
 */
export const numericColumns = memoByDataset((dataset): ReadonlySet<string> => {
  const numeric = new Set<string>();
  for (const column of dataset.columns) {
    let filled = 0;
    let parsed = 0;
    for (const row of dataset.rows) {
      const value = cell(row, column.id);
      if (value.trim() === '') continue;
      filled += 1;
      if (parseNumber(value) !== null) parsed += 1;
    }
    if (filled > 0 && parsed / filled >= NUMERIC_SHARE) numeric.add(column.id);
  }
  return numeric;
});
