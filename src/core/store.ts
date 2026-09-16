import { computed, effect, signal } from '@preact/signals';
import type { Dataset } from './model';
import { EMPTY_VIEW, type ViewFilter, type ViewSort, type ViewState } from './view';
import {
  applyRecipe,
  createRecipe,
  withoutStep,
  type Recipe,
  type ReplayLookup,
  type ReplayMessages,
} from './recipes';
import { DEFAULT_SETTINGS, type Settings } from './settings';
export type { ViewFilter, ViewSort, ViewState } from './view';
import {
  clear as clearStorage,
  deserialize,
  load,
  save,
  serialize,
  type Persisted,
} from './storage';
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
const viewFilterSignal = signal<ViewFilter | null>(null);
const viewQuerySignal = signal<string>('');
const viewSortSignal = signal<ViewSort | null>(null);
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

/** The value picked in the column profile, or null when the whole list is shown. */
export const viewFilter = computed<ViewFilter | null>(() => viewFilterSignal.value);

/** What is typed in the search box. It narrows the view and never the list. */
export const viewQuery = computed<string>(() => viewQuerySignal.value);

/** The order the table shows rows in, or null for the list's own order. */
export const viewSort = computed<ViewSort | null>(() => viewSortSignal.value);

/**
 * The whole view in one value: what Copy, the export dialog and anything else that
 * takes "what is on screen" reads, so they can never disagree about what that is.
 */
export const activeView = computed<ViewState>(() => ({
  query: viewQuerySignal.value,
  filter: viewFilterSignal.value,
  sort: viewSortSignal.value,
  ticked: selectedRowsSignal.value,
}));

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
 * The view belongs to the list on screen. Whenever another list takes its place —
 * a new one, a switched tab, a closed one, a restored workspace — the search, the
 * filter, the sort, the ticks and the counted column all start over.
 */
function resetView(): void {
  selectedColumnSignal.value = null;
  selectedRowsSignal.value = EMPTY_VIEW.ticked;
  viewFilterSignal.value = EMPTY_VIEW.filter;
  viewQuerySignal.value = EMPTY_VIEW.query;
  viewSortSignal.value = EMPTY_VIEW.sort;
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
  resetView();
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
  resetView();
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
    resetView();
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

/** Show only the rows whose column holds this value. null shows everything again. */
export function setViewFilter(filter: ViewFilter | null): void {
  viewFilterSignal.value = filter;
}

/** Narrow the view to the rows matching the search box. '' shows everything again. */
export function setViewQuery(query: string): void {
  viewQuerySignal.value = query;
}

/** Order the view by a column. null returns to the list's own order. */
export function setViewSort(sort: ViewSort | null): void {
  viewSortSignal.value = sort;
}

/** A header click: ascending, then descending, then the list's own order again. */
export function toggleViewSort(columnId: string): void {
  const current = viewSortSignal.value;
  if (current === null || current.columnId !== columnId) {
    viewSortSignal.value = { columnId, direction: 'asc' };
  } else if (current.direction === 'asc') {
    viewSortSignal.value = { columnId, direction: 'desc' };
  } else {
    viewSortSignal.value = null;
  }
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

/** The highest number used by a set of ids of the form `<prefix><n>`. */
function highestNumber(ids: string[], prefix: string): number {
  return ids.reduce((top, id) => {
    const parsed = Number.parseInt(id.replace(new RegExp(`^${prefix}`), ''), 10);
    return Number.isFinite(parsed) ? Math.max(top, parsed) : top;
  }, 0);
}

/**
 * Put a whole workspace in place: what storage held at start-up, and what a saved file
 * holds when one is opened. Ids are never reused, so the counters continue past whatever
 * arrived — a restored list can never collide with one made afterwards.
 */
export function restoreWorkspace(stored: Persisted): void {
  settingsSignal.value = stored.settings;
  favoritesSignal.value = stored.favorites;
  recentsSignal.value = stored.recents;
  recipesSignal.value = stored.recipes;
  nextRecipeNumber = highestNumber(stored.recipes.map((recipe) => recipe.id), 'r') + 1;

  tabs.value = stored.datasets.map((dataset) => ({
    id: dataset.id,
    history: createHistory(dataset),
  }));
  activeIdSignal.value = stored.datasets[0]?.id ?? null;
  resetView();

  nextDatasetNumber = highestNumber(stored.datasets.map((dataset) => dataset.id), 'd') + 1;
}

/** Restore the workspace from storage. Called once, before the first render. */
export function hydrate(): void {
  restoreWorkspace(load());
}

/** The whole workspace as text, for saving a copy to a file. */
export function workspaceFile(): string {
  return serialize({
    settings: settingsSignal.value,
    favorites: favoritesSignal.value,
    recents: recentsSignal.value,
    datasets: tabs.value.map((tab) => current(tab.history)),
    recipes: recipesSignal.value,
  });
}

/**
 * Open a saved workspace, replacing what is here. Returns false when the text is not one,
 * so the caller can say so rather than quietly emptying the screen.
 */
export function openWorkspaceFile(text: string): boolean {
  const parsed = deserialize(text);
  if (parsed === null) return false;
  restoreWorkspace(parsed);
  return true;
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
  resetView();
  settingsSignal.value = DEFAULT_SETTINGS;
  favoritesSignal.value = [];
  recentsSignal.value = [];
  recipesSignal.value = [];
  setNotice('');
  nextDatasetNumber = 1;
  nextRecipeNumber = 1;
}
