import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activeDataset,
  addDataset,
  applyStep,
  canRedoActive,
  canUndoActive,
  close,
  duplicate,
  openDatasets,
  redo,
  rename,
  resetWorkspace,
  selectColumn,
  favorites,
  noteToolUsed,
  notice,
  recents,
  settings,
  selectedColumn,
  setActive,
  setNotice,
  toggleFavorite,
  undo,
  updateSettings,
} from './store';
import { cell, valuesDataset, VALUE_COLUMN } from './model';
import type { Step } from './history';

const parseRef = { parserId: 'lines', options: {} };

function list(...values: string[]) {
  return valuesDataset(values, 'Value', values.join('\n'), parseRef);
}

const step: Step = { toolId: 'trim', options: {}, summary: 'Trimmed', at: 0 };

function activeValues(): string[] {
  return (activeDataset.value?.rows ?? []).map((row) => cell(row, VALUE_COLUMN));
}

beforeEach(() => {
  resetWorkspace();
});

describe('workspace', () => {
  it('starts empty', () => {
    expect(openDatasets.value).toEqual([]);
    expect(activeDataset.value).toBeNull();
  });

  it('adds a list, gives it an id and makes it active', () => {
    const id = addDataset(list('a'), 'Recipients');
    expect(activeDataset.value?.id).toBe(id);
    expect(activeDataset.value?.name).toBe('Recipients');
  });

  it('gives every list a distinct id', () => {
    const first = addDataset(list('a'), 'A');
    const second = addDataset(list('b'), 'B');
    expect(first).not.toBe(second);
    expect(openDatasets.value).toHaveLength(2);
  });

  it('switches the active list', () => {
    const first = addDataset(list('a'), 'A');
    addDataset(list('b'), 'B');
    setActive(first);
    expect(activeDataset.value?.name).toBe('A');
  });

  it('ignores a request to activate a list that is not open', () => {
    const id = addDataset(list('a'), 'A');
    setActive('nope');
    expect(activeDataset.value?.id).toBe(id);
  });
});

describe('steps and undo', () => {
  it('has nothing to undo before the first step', () => {
    addDataset(list('a'), 'A');
    expect(canUndoActive.value).toBe(false);
    expect(canRedoActive.value).toBe(false);
  });

  it('applies a step and can undo and redo it', () => {
    const id = addDataset(list('a', 'b'), 'A');
    applyStep(id, step, list('a'));

    expect(activeValues()).toEqual(['a']);
    expect(canUndoActive.value).toBe(true);

    undo(id);
    expect(activeValues()).toEqual(['a', 'b']);
    expect(canRedoActive.value).toBe(true);

    redo(id);
    expect(activeValues()).toEqual(['a']);
  });

  it('keeps the tab identity through a step, whatever the tool returns', () => {
    const id = addDataset(list('a'), 'Recipients');
    applyStep(id, step, { ...list('b'), id: 'draft', name: '' });

    expect(activeDataset.value?.id).toBe(id);
    expect(activeDataset.value?.name).toBe('Recipients');
  });

  it('ignores a step aimed at a list that is not open', () => {
    addDataset(list('a'), 'A');
    applyStep('nope', step, list('b'));
    expect(activeValues()).toEqual(['a']);
  });

  it('undoes each list independently', () => {
    const first = addDataset(list('a'), 'A');
    const second = addDataset(list('x'), 'B');
    applyStep(first, step, list('a2'));
    applyStep(second, step, list('x2'));

    undo(first);
    expect(activeValues()).toEqual(['x2']);
    setActive(first);
    expect(activeValues()).toEqual(['a']);
  });
});

describe('tabs', () => {
  it('renames without touching the undo stack', () => {
    const id = addDataset(list('a'), 'A');
    rename(id, '  Recipients  ');
    expect(activeDataset.value?.name).toBe('Recipients');
    expect(canUndoActive.value).toBe(false);
  });

  it('refuses an empty name', () => {
    const id = addDataset(list('a'), 'A');
    rename(id, '   ');
    expect(activeDataset.value?.name).toBe('A');
  });

  it('duplicates the current state into a new list with its own history', () => {
    const id = addDataset(list('a', 'b'), 'A');
    applyStep(id, step, list('a'));
    const copy = duplicate(id, 'A (copy)');

    expect(copy).not.toBeNull();
    expect(activeValues()).toEqual(['a']);
    expect(canUndoActive.value).toBe(false);
  });

  it('returns null when duplicating a list that is not open', () => {
    expect(duplicate('nope', 'x')).toBeNull();
  });

  it('closing the active list activates its neighbour', () => {
    addDataset(list('a'), 'A');
    const second = addDataset(list('b'), 'B');
    addDataset(list('c'), 'C');
    setActive(second);
    close(second);

    expect(activeDataset.value?.name).toBe('C');
    expect(openDatasets.value).toHaveLength(2);
  });

  it('closing the last list leaves an empty workspace', () => {
    const id = addDataset(list('a'), 'A');
    close(id);
    expect(activeDataset.value).toBeNull();
    expect(openDatasets.value).toEqual([]);
  });

  it('closing an inactive list leaves the active one alone', () => {
    const first = addDataset(list('a'), 'A');
    const second = addDataset(list('b'), 'B');
    close(first);
    expect(activeDataset.value?.id).toBe(second);
  });
});

describe('column selection', () => {
  it('starts on the whole row', () => {
    addDataset(list('a'), 'A');
    expect(selectedColumn.value).toBeNull();
  });

  it('selects and clears a column', () => {
    addDataset(list('a'), 'A');
    selectColumn(VALUE_COLUMN);
    expect(selectedColumn.value).toBe(VALUE_COLUMN);
    selectColumn(null);
    expect(selectedColumn.value).toBeNull();
  });

  it('clears the selection when the active list changes', () => {
    const first = addDataset(list('a'), 'A');
    addDataset(list('b'), 'B');
    selectColumn(VALUE_COLUMN);
    setActive(first);
    expect(selectedColumn.value).toBeNull();
  });
});

describe('status messages', () => {
  it('shows a message and clears it again', () => {
    vi.useFakeTimers();
    setNotice('Copied to clipboard');
    expect(notice.value).toBe('Copied to clipboard');

    vi.advanceTimersByTime(4000);
    expect(notice.value).toBe('');
    vi.useRealTimers();
  });

  it('a second message restarts the clock instead of stacking timers', () => {
    vi.useFakeTimers();
    setNotice('first');
    vi.advanceTimersByTime(3000);
    setNotice('second');
    vi.advanceTimersByTime(3000);
    expect(notice.value).toBe('second');

    vi.advanceTimersByTime(1000);
    expect(notice.value).toBe('');
    vi.useRealTimers();
  });
});

describe('settings, favorites and recents', () => {
  it('starts on the defaults', () => {
    expect(settings.value.sortLocale).toBe('sv');
    expect(favorites.value).toEqual([]);
    expect(recents.value).toEqual([]);
  });

  it('updates one setting without touching the others', () => {
    updateSettings({ sortLocale: 'en' });
    expect(settings.value.sortLocale).toBe('en');
    expect(settings.value.naturalSort).toBe(true);
  });

  it('toggles a favorite on and off', () => {
    toggleFavorite('sort');
    expect(favorites.value).toEqual(['sort']);
    toggleFavorite('sort');
    expect(favorites.value).toEqual([]);
  });

  it('puts the most recent tool first and never repeats one', () => {
    noteToolUsed('trim-whitespace');
    noteToolUsed('sort');
    noteToolUsed('trim-whitespace');
    expect(recents.value).toEqual(['trim-whitespace', 'sort']);
  });

  it('remembers only the last five tools', () => {
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) noteToolUsed(id);
    expect(recents.value).toEqual(['f', 'e', 'd', 'c', 'b']);
  });
});
