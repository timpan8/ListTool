import type { Dataset } from './model';
import type { Options } from './registry';

/**
 * One history per dataset. Steps are serializable (id + options), which is what makes
 * saved recipes a small feature later instead of a rewrite.
 */
export interface Step {
  toolId: string;
  options: Options;
  summary: string;
  at: number;
  /** The rows the tool ran on, when it ran on the ticked rows only. */
  scope?: { rows: string[] };
}

export interface HistoryEntry {
  step: Step;
  /** The dataset AFTER the step. */
  snapshot: Dataset;
}

/**
 * Re-parsing is a step like any other so that it is undoable and replayable. It has no
 * Tool behind it, so it uses this reserved id; its options carry the parser id.
 */
export const PARSE_STEP_ID = 'parse';

export interface History {
  /** The dataset before any step ran. */
  initial: Dataset;
  entries: HistoryEntry[];
  /** -1 = showing `initial`; otherwise the index in `entries` being shown. */
  index: number;
}

export function createHistory(initial: Dataset): History {
  return { initial, entries: [], index: -1 };
}

export function current(history: History): Dataset {
  if (history.index < 0) return history.initial;
  return history.entries[history.index]?.snapshot ?? history.initial;
}

/** Applying a step drops any redo tail — the old future is no longer reachable. */
export function pushStep(history: History, step: Step, snapshot: Dataset): History {
  const kept = history.entries.slice(0, history.index + 1);
  return {
    initial: history.initial,
    entries: [...kept, { step, snapshot }],
    index: kept.length,
  };
}

export function canUndo(history: History): boolean {
  return history.index >= 0;
}

export function canRedo(history: History): boolean {
  return history.index < history.entries.length - 1;
}

export function undo(history: History): History {
  return canUndo(history) ? { ...history, index: history.index - 1 } : history;
}

export function redo(history: History): History {
  return canRedo(history) ? { ...history, index: history.index + 1 } : history;
}

/**
 * A name belongs to the tab, not to any one step, so renaming rewrites every snapshot
 * and records nothing: undo must not resurrect an old name.
 */
export function renameDataset(history: History, name: string): History {
  return {
    initial: { ...history.initial, name },
    entries: history.entries.map((entry) => ({
      ...entry,
      snapshot: { ...entry.snapshot, name },
    })),
    index: history.index,
  };
}

/** The steps that led to what is on screen — the history panel and recipes read this. */
export function appliedSteps(history: History): Step[] {
  return history.entries.slice(0, history.index + 1).map((entry) => entry.step);
}
