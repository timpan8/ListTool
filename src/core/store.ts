import { computed, effect, signal } from '@preact/signals';
import type { Dataset } from './model';
import {
  applyRecipe,
  createRecipe,
  withoutStep,
  type Recipe,
  type ReplayLookup,
  type ReplayMessages,
} from './recipes';
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
const selectedRowsSignal = signal<string[]>([]);
const noticeSignal = signal<string>('');
const settingsSignal = signal<Settings>(DEFAULT_SETTINGS);
const favoritesSignal = signal<string[]>([]);
const recentsSignal = signal<string[]>([]);
const recipesSignal = signal<Recipe[]>([]);

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

/**
 * Rows ticked in the table, in the active list's own order. A tool asks for them by
 * declaring a `rows` option field; the shell never decides what a selection means.
 */
export const selectedRows = computed<string[]>(() => selectedRowsSignal.value);

/** Transient message for the status region: "Copied to clipboard". */
export const notice = computed<string>(() => noticeSignal.value);

export const settings = computed<Settings>(() => settingsSignal.value);
export const favorites = computed<string[]>(() => favoritesSignal.value);
export const recents = computed<string[]>(() => recentsSignal.value);
export const recipes = computed<Recipe[]>(() => recipesSignal.value);

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
  selectedRowsSignal.value = [];
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
  // A tick on a row that the step removed means nothing, so it goes; the rest survive,
  // which is what lets someone tick once and then run two tools over the same rows.
  if (id === activeIdSignal.value) pruneSelection(snapshot);
}

function pruneSelection(dataset: Dataset): void {
  const alive = new Set(dataset.rows.map((row) => row.id));
  const kept = selectedRowsSignal.value.filter((rowId) => alive.has(rowId));
  if (kept.length !== selectedRowsSignal.value.length) selectedRowsSignal.value = kept;
}

export function undo(id: string): void {
  updateTab(id, undoHistory);
  pruneAfterMove(id);
}

export function redo(id: string): void {
  updateTab(id, redoHistory);
  pruneAfterMove(id);
}

function pruneAfterMove(id: string): void {
  if (id !== activeIdSignal.value) return;
  const tab = tabs.value.find((candidate) => candidate.id === id);
  if (tab !== undefined) pruneSelection(current(tab.history));
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
  selectedRowsSignal.value = [];
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
    selectedRowsSignal.value = [];
  }
}

export function selectColumn(columnId: string | null): void {
  selectedColumnSignal.value = columnId;
}

/** Tick or untick one row. Order follows the list, never the order they were clicked. */
export function toggleRow(rowId: string): void {
  const chosen = new Set(selectedRowsSignal.value);
  if (chosen.has(rowId)) chosen.delete(rowId);
  else chosen.add(rowId);
  const dataset = activeDataset.value;
  const order = dataset === null ? [...chosen] : dataset.rows.map((row) => row.id);
  selectedRowsSignal.value = order.filter((id) => chosen.has(id));
}

/** Replace the whole selection — "tick every row shown" and "clear" both come here. */
export function selectRows(rowIds: string[]): void {
  selectedRowsSignal.value = rowIds;
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

// ---------- recipes ----------

let nextRecipeNumber = 1;

/** Save the steps behind what is on screen as a named, replayable recipe. */
export function saveRecipe(name: string, steps: Step[], at: number): string | null {
  const trimmed = name.trim();
  if (trimmed === '' || steps.length === 0) return null;

  const id = `r${nextRecipeNumber}`;
  nextRecipeNumber += 1;
  recipesSignal.value = [...recipesSignal.value, createRecipe(id, trimmed, steps, at)];
  return id;
}

export function removeRecipe(id: string): void {
  recipesSignal.value = recipesSignal.value.filter((recipe) => recipe.id !== id);
}

export function removeRecipeStep(id: string, index: number): void {
  recipesSignal.value = recipesSignal.value.map((recipe) =>
    recipe.id === id ? withoutStep(recipe, index) : recipe,
  );
}

/**
 * Replay a recipe on a list. The whole replay is ONE undoable step: a recipe is a single
 * action to the person using it, however many tools it runs.
 */
export function runRecipe(
  datasetId: string,
  recipeId: string,
  lookup: ReplayLookup,
  messages: ReplayMessages,
  summaryOf: (recipe: Recipe, applied: Step[]) => string,
): string[] {
  const recipe = recipesSignal.value.find((candidate) => candidate.id === recipeId);
  const tab = tabs.value.find((candidate) => candidate.id === datasetId);
  if (recipe === undefined || tab === undefined) return [];

  const result = applyRecipe(recipe, current(tab.history), lookup, messages);
  applyStep(
    datasetId,
    {
      toolId: `recipe:${recipe.id}`,
      options: { recipeId: recipe.id },
      summary: summaryOf(recipe, result.applied),
      at: Date.now(),
    },
    result.output,
  );
  return result.warnings;
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
    recipes: recipesSignal.value,
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
  recipesSignal.value = stored.recipes;
  nextRecipeNumber =
    stored.recipes.reduce((top, recipe) => {
      const parsed = Number.parseInt(recipe.id.replace(/^r/, ''), 10);
      return Number.isFinite(parsed) ? Math.max(top, parsed) : top;
    }, 0) + 1;

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
    void recipesSignal.value;

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
  selectedRowsSignal.value = [];
  settingsSignal.value = DEFAULT_SETTINGS;
  favoritesSignal.value = [];
  recentsSignal.value = [];
  recipesSignal.value = [];
  setNotice('');
  nextDatasetNumber = 1;
  nextRecipeNumber = 1;
}
