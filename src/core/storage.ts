import type { Dataset } from './model';
import { DEFAULT_SETTINGS, readSettings, type Settings } from './settings';

/** One key, JSON. Nothing about a list ever goes into the URL. */
export const STORAGE_KEY = 'list-tool';
const VERSION = 1;

export interface Persisted {
  version: number;
  settings: Settings;
  favorites: string[];
  recents: string[];
  /** Only written when "Keep lists between sessions" is on. */
  datasets: Dataset[];
}

export type SaveResult = 'saved' | 'quota' | 'unavailable';

export const EMPTY_PERSISTED: Persisted = {
  version: VERSION,
  settings: DEFAULT_SETTINGS,
  favorites: [],
  recents: [],
  datasets: [],
};

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // A browser with site data blocked throws on access alone.
    return null;
  }
}

function readStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function readDataset(value: unknown): Dataset | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw['id'] !== 'string' || typeof raw['name'] !== 'string') return null;
  if (!Array.isArray(raw['columns']) || !Array.isArray(raw['rows'])) return null;
  return raw as unknown as Dataset;
}

/** Read what was stored. Anything unreadable is treated as "nothing stored". */
export function load(): Persisted {
  const store = storage();
  if (store === null) return EMPTY_PERSISTED;

  try {
    const text = store.getItem(STORAGE_KEY);
    if (text === null) return EMPTY_PERSISTED;

    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_PERSISTED;
    const raw = parsed as Record<string, unknown>;

    return {
      version: typeof raw['version'] === 'number' ? raw['version'] : VERSION,
      settings: readSettings(raw['settings']),
      favorites: readStrings(raw['favorites']),
      recents: readStrings(raw['recents']),
      datasets: Array.isArray(raw['datasets'])
        ? raw['datasets'].map(readDataset).filter((dataset): dataset is Dataset => dataset !== null)
        : [],
    };
  } catch {
    return EMPTY_PERSISTED;
  }
}

/**
 * Write. A full quota is reported rather than thrown: the app keeps working in memory
 * and the caller warns once.
 */
export function save(state: Omit<Persisted, 'version'>): SaveResult {
  const store = storage();
  if (store === null) return 'unavailable';

  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, ...state }));
    return 'saved';
  } catch (error) {
    const quota =
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    return quota ? 'quota' : 'unavailable';
  }
}

/** Wipe the single key immediately. */
export function clear(): void {
  const store = storage();
  if (store === null) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do — there is no other copy to remove.
  }
}
