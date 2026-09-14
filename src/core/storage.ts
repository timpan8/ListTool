import type { Dataset } from './model';
import type { Recipe } from './recipes';
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
  recipes: Recipe[];
}

export type SaveResult = 'saved' | 'quota' | 'unavailable';

export const EMPTY_PERSISTED: Persisted = {
  version: VERSION,
  settings: DEFAULT_SETTINGS,
  favorites: [],
  recents: [],
  datasets: [],
  recipes: [],
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

function readRecipe(value: unknown): Recipe | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw['id'] !== 'string' || typeof raw['name'] !== 'string') return null;
  if (!Array.isArray(raw['steps'])) return null;
  return raw as unknown as Recipe;
}

function readDataset(value: unknown): Dataset | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw['id'] !== 'string' || typeof raw['name'] !== 'string') return null;
  if (!Array.isArray(raw['columns']) || !Array.isArray(raw['rows'])) return null;
  return raw as unknown as Dataset;
}

/**
 * Narrow an unknown value into a workspace, field by field. Used for what localStorage
 * holds and for what a saved file holds — a file is only a copy of the same thing, so it
 * gets exactly the same scrutiny and no separate format to keep in step.
 */
export function readPersisted(value: unknown): Persisted {
  if (typeof value !== 'object' || value === null) return EMPTY_PERSISTED;
  const raw = value as Record<string, unknown>;

  return {
    version: typeof raw['version'] === 'number' ? raw['version'] : VERSION,
    settings: readSettings(raw['settings']),
    favorites: readStrings(raw['favorites']),
    recents: readStrings(raw['recents']),
    datasets: Array.isArray(raw['datasets'])
      ? raw['datasets'].map(readDataset).filter((dataset): dataset is Dataset => dataset !== null)
      : [],
    recipes: Array.isArray(raw['recipes'])
      ? raw['recipes'].map(readRecipe).filter((recipe): recipe is Recipe => recipe !== null)
      : [],
  };
}

/** Read what was stored. Anything unreadable is treated as "nothing stored". */
export function load(): Persisted {
  const store = storage();
  if (store === null) return EMPTY_PERSISTED;

  try {
    const text = store.getItem(STORAGE_KEY);
    if (text === null) return EMPTY_PERSISTED;
    return readPersisted(JSON.parse(text));
  } catch {
    return EMPTY_PERSISTED;
  }
}

/** The workspace as a file's worth of text. Never leaves the browser unless saved. */
export function serialize(state: Omit<Persisted, 'version'>): string {
  return JSON.stringify({ version: VERSION, ...state }, null, 2);
}

/** Read a saved file back. null when the text is not a workspace at all. */
export function deserialize(text: string): Persisted | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (!('version' in parsed)) return null;
    return readPersisted(parsed);
  } catch {
    return null;
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
