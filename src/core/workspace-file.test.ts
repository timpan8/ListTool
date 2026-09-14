import { beforeEach, describe, expect, it } from 'vitest';
import {
  activeDataset,
  addDataset,
  applyStep,
  favorites,
  noteToolUsed,
  openDatasets,
  openWorkspaceFile,
  recents,
  resetWorkspace,
  saveRecipe,
  recipes,
  settings,
  toggleFavorite,
  updateSettings,
  workspaceFile,
} from './store';
import { cell, valuesDataset, VALUE_COLUMN } from './model';
import { deserialize, serialize } from './storage';
import type { Step } from './history';

function list(...values: string[]) {
  return valuesDataset(values, 'Value', values.join('\n'), { parserId: 'lines', options: {} });
}

const step: Step = { toolId: 'trim-whitespace', options: {}, summary: 'Trimmed', at: 0 };

beforeEach(() => {
  resetWorkspace();
});

describe('saving and opening a workspace file', () => {
  it('brings the lists back, with their names', () => {
    addDataset(list('a', 'b'), 'People');
    const file = workspaceFile();

    resetWorkspace();
    expect(openDatasets.value).toEqual([]);

    expect(openWorkspaceFile(file)).toBe(true);
    expect(openDatasets.value.map((dataset) => dataset.name)).toEqual(['People']);
    expect(activeDataset.value?.rows.map((row) => cell(row, VALUE_COLUMN))).toEqual(['a', 'b']);
  });

  it('brings the settings, favourites, recents and recipes back too', () => {
    updateSettings({ sortLocale: 'en' });
    toggleFavorite('sort');
    noteToolUsed('trim-whitespace');
    saveRecipe('Clean up', [step], 0);
    const file = workspaceFile();

    resetWorkspace();
    openWorkspaceFile(file);

    expect(settings.value.sortLocale).toBe('en');
    expect(favorites.value).toEqual(['sort']);
    expect(recents.value).toEqual(['trim-whitespace']);
    expect(recipes.value.map((recipe) => recipe.name)).toEqual(['Clean up']);
  });

  it('saves the list as it is now, not as it was imported', () => {
    const id = addDataset(list(' a '), 'A');
    applyStep(id, step, { ...list('a'), id, name: 'A' });
    const file = workspaceFile();

    resetWorkspace();
    openWorkspaceFile(file);
    expect(activeDataset.value?.rows.map((row) => cell(row, VALUE_COLUMN))).toEqual(['a']);
  });

  it('replaces what was open rather than adding to it', () => {
    addDataset(list('a'), 'A');
    const file = workspaceFile();

    resetWorkspace();
    addDataset(list('x'), 'X');
    addDataset(list('y'), 'Y');
    openWorkspaceFile(file);

    expect(openDatasets.value.map((dataset) => dataset.name)).toEqual(['A']);
  });

  it('never reuses an id, so a list made afterwards cannot collide', () => {
    addDataset(list('a'), 'A');
    addDataset(list('b'), 'B');
    const file = workspaceFile();

    resetWorkspace();
    openWorkspaceFile(file);
    const fresh = addDataset(list('c'), 'C');

    expect(openDatasets.value.map((dataset) => dataset.id)).toEqual(['d1', 'd2', fresh]);
    expect(new Set(openDatasets.value.map((dataset) => dataset.id)).size).toBe(3);
  });

  it('refuses text that is not a workspace, and changes nothing', () => {
    addDataset(list('a'), 'A');
    expect(openWorkspaceFile('not json at all')).toBe(false);
    expect(openWorkspaceFile('{"lists": []}')).toBe(false);
    expect(openDatasets.value.map((dataset) => dataset.name)).toEqual(['A']);
  });

  it('opens an empty workspace, which is a real thing to have saved', () => {
    const file = workspaceFile();
    addDataset(list('a'), 'A');
    expect(openWorkspaceFile(file)).toBe(true);
    expect(openDatasets.value).toEqual([]);
  });

  it('writes a file a person can read and a reader can narrow', () => {
    addDataset(list('a'), 'A');
    const file = workspaceFile();

    expect(file).toContain('\n  ');
    expect(deserialize(file)?.datasets).toHaveLength(1);
  });

  it('drops a list the file describes wrongly instead of loading a broken one', () => {
    const file = serialize({
      settings: settings.value,
      favorites: [],
      recents: [],
      datasets: [{ id: 'd1' } as never, { ...list('a'), id: 'd2', name: 'Good' }],
      recipes: [],
    });
    openWorkspaceFile(file);
    expect(openDatasets.value.map((dataset) => dataset.name)).toEqual(['Good']);
  });
});
