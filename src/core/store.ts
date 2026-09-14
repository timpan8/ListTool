import { computed, effect, signal } from '@preact/signals';
import type { Dataset } from './model';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import { clear as clearStorage, load, save } from './storage';
import {
  canRedo,
  canUndo,
  createHistory,
  current,
  pushStep,
  redo as redoHistory,
  renameDataset,
  undo as undoHistory,
  type History,
  type Step,
} from './history';

/** One open list: a tab in the UI, a history in the model. */
export interface Tab {
  id: string;
  history: History;
}

const tabs = signal<Tab[]>([]);
const activeIdSignal = signal<string | null>(null);
const selectedColumnSignal = signal<string | null>(null);
const noticeSignal = signal<string>('');
const settingsSignal = signal<Settings>(DEFAULT_SETTINGS);
const favoritesSignal = signal<string[]>([]);
const recentsSignal = signal<string[]>([]);

let nextDatasetNumber = 1;

/** Ids are never reused, so a closed tab can never collide with a new one. */
function nextId(): string {
  return `d${nextDatasetNumber}`;
}

export const openDatasets = computed<Dataset[]>(() =>
  tabs.value.map((tab) => current(tab.history)),
);

export const activeId = computed<string | null>(() => activeIdSignal.value);

export const activeDataset = computed<Dataset | null>(() => {
  const id = activeIdSignal.value;
  if (id === null) return null;
  const tab = tabs.value.find((candidate) => candidate.id === id);
  return tab === undefined ? null : current(tab.history);
});

export const activeHistory = computed<History | null>(() => {
  const id = activeIdSignal.value;
  const tab = tabs.value.find((candidate) => candidate.id === id);
  return tab?.history ?? null;
});

export const canUndoActive = computed<boolean>(() => {
  const history = activeHistory.value;
  return history !== null && canUndo(history);
});

export const canRedoActive = computed<boolean>(() => {
  const history = activeHistory.value;
  return history !== null && canRedo(history);
});

/** Column the status bar counts on. null = the whole row. */
export const selectedColumn = computed<string | null>(() => selectedColumnSignal.value);

/** Transient message for the status region: "Copied to clipboard". */
export const notice = computed<string>(() => noticeSignal.value);

export const settings = computed<Settings>(() => settingsSignal.value);
export const favorites = computed<string[]>(() => favoritesSignal.value);
export const recents = computed<string[]>(() => recentsSignal.value);

function updateTab(id: string, change: (history: History) => History): void {
  tabs.value = tabs.value.map((tab) =>
    tab.id === id ? { ...tab, history: change(tab.history) } : tab,
  );
}

/**
 * Put a parsed dataset into the workspace. Parsers produce drafts with no identity;
 * this is where a list gets its id and its tab.
 */
export function addDataset(draft: Dataset, name: string): string {
  const id = nextId();
  nextDatasetNumber += 1;
  const dataset: Dataset = { ...draft, id, name };
  tabs.value = [...tabs.value, { id, history: createHistory(dataset) }];
  activeIdSignal.value = id;
  selectedColumnSignal.value = null;
  return id;
}

/** The number to use in the default name of the next list. */
export function nextDatasetNumberForName(): number {
  return nextDatasetNumber;
}

/** Record a transformation. The output keeps the tab's identity. */
export function applyStep(id: string, step: Step, output: Dataset): void {
  const tab = tabs.value.find((candidate) => candidate.id === id);
  if (tab === undefined) return;
  const identity = current(tab.history);
  const snapshot: Dataset = { ...output, id: identity.id, name: identity.name };
  updateTab(id, (history) => pushStep(history, step, snapshot));
}

export function undo(id: string): void {
  updateTab(id, undoHistory);
}

export function redo(id: string): void {
  updateTab(id, redoHistory);
}

export function rename(id: string, name: string): void {
  const trimmed = name.trim();
  if (trimmed === '') return;
  updateTab(id, (history) => renameDataset(history, trimmed));
}

export function setActive(id: string): void {
  if (!tabs.value.some((tab) => tab.id === id)) return;
  activeIdSignal.value = id;
  selectedColumnSignal.value = null;
}

/** A duplicate starts a fresh history: it is a new list, not a branch of the old one. */
export function duplicate(id: string, name: string): string | null {
  const tab = tabs.value.find((candidate) => candidate.id === id);
  if (tab === undefined) return null;
  return addDataset(current(tab.history), name);
}

export function close(id: string): void {
  const remaining = tabs.value.filter((tab) => tab.id !== id);
  if (remaining.length === tabs.value.length) return;

  const closedAt = tabs.value.findIndex((tab) => tab.id === id);
  tabs.value = remaining;

  if (activeIdSignal.value === id) {
    const neighbour = remaining[Math.min(closedAt, remaining.length - 1)];
    activeIdSignal.value = neighbour?.id ?? null;
    selectedColumnSignal.value = null;
  }
}

export function selectColumn(columnId: string | null): void {
  selectedColumnSignal.value = columnId;
}

/** How long a status message stays before the status bar goes quiet again. */
const NOTICE_MS = 4000;
let noticeTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Feedback, not state: "Copied to clipboard" clears itself so the status bar never
 * claims something that stopped being true minutes ago.
 */
export function setNotice(message: string): void {
  if (noticeTimer !== undefined) clearTimeout(noticeTimer);
  noticeSignal.value = message;
  if (message === '') return;
  noticeTimer = setTimeout(() => {
    noticeSignal.value = '';
    noticeTimer = undefined;
  }, NOTICE_MS);
}


// ---------- settings, favorites, recents ----------

export function updateSettings(change: Partial<Settings>): void {
  settingsSignal.value = { ...settingsSignal.value, ...change };
}

export function toggleFavorite(toolId: string): void {
  const current = favoritesSignal.value;
  favoritesSignal.value = current.includes(toolId)
    ? current.filter((id) => id !== toolId)
    : [...current, toolId];
}

/** How many recently used tools to remember. */
const RECENTS_LIMIT = 5;

export function noteToolUsed(toolId: string): void {
  const without = recentsSignal.value.filter((id) => id !== toolId);
  recentsSignal.value = [toolId, ...without].slice(0, RECENTS_LIMIT);
}

// ---------- persistence ----------

/** Writes are debounced: typing in a tool option should not hit storage per keystroke. */
const SAVE_DELAY_MS = 400;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let quotaWarned = false;

function persistNow(onQuota: () => void): void {
  const keep = settingsSignal.value.keepLists;
  const result = save({
    settings: settingsSignal.value,
    favorites: favoritesSignal.value,
    recents: recentsSignal.value,
    datasets: keep ? tabs.value.map((tab) => current(tab.history)) : [],
  });

  if (result === 'quota' && !quotaWarned) {
    quotaWarned = true;
    onQuota();
  }
}

/**
 * Restore the workspace from storage. Ids are never reused, so the counter continues
 * past whatever was stored.
 */
export function hydrate(): void {
  const stored = load();
  settingsSignal.value = stored.settings;
  favoritesSignal.value = stored.favorites;
  recentsSignal.value = stored.recents;

  if (stored.datasets.length > 0) {
    tabs.value = stored.datasets.map((dataset) => ({
      id: dataset.id,
      history: createHistory(dataset),
    }));
    activeIdSignal.value = stored.datasets[0]?.id ?? null;
  }

  const highest = stored.datasets.reduce((top, dataset) => {
    const parsed = Number.parseInt(dataset.id.replace(/^d/, ''), 10);
    return Number.isFinite(parsed) ? Math.max(top, parsed) : top;
  }, 0);
  nextDatasetNumber = highest + 1;
}

/** Start saving on every change. Returns a stop function. */
export function startPersistence(onQuota: () => void): () => void {
  return effect(() => {
    // Touch everything that is persisted so the effect re-runs when any of it changes.
    void tabs.value;
    void settingsSignal.value;
    void favoritesSignal.value;
    void recentsSignal.value;

    if (saveTimer !== undefined) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      persistNow(onQuota);
      saveTimer = undefined;
    }, SAVE_DELAY_MS);
  });
}

/** Settings → Clear all data: wipe the key and empty the workspace immediately. */
export function clearAllData(): void {
  if (saveTimer !== undefined) clearTimeout(saveTimer);
  saveTimer = undefined;
  clearStorage();
  resetWorkspace();
  quotaWarned = false;
}

/** Test seam: drop everything and start over. */
export function resetWorkspace(): void {
  tabs.value = [];
  activeIdSignal.value = null;
  selectedColumnSignal.value = null;
  settingsSignal.value = DEFAULT_SETTINGS;
  favoritesSignal.value = [];
  recentsSignal.value = [];
  setNotice('');
  nextDatasetNumber = 1;
}
