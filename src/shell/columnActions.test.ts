import { beforeEach, describe, expect, it } from 'vitest';
import { columnActions, makeSortPermanent, type ColumnContext } from './columnActions';
import type { MenuItem } from './ColumnMenu';
import type { PanelIntent } from './panelIntent';
import { DEFAULT_SETTINGS } from '../core/settings';
import {
  activeDataset,
  activeHistory,
  activeView,
  addDataset,
  resetWorkspace,
  selectedColumn,
  setViewFilter,
  setViewSort,
  viewFilter,
  viewSort,
} from '../core/store';
import { EMPTY_VIEW } from '../core/view';
import type { Dataset } from '../core/model';
import { listOf, tableOf } from '../test/fixtures';

function open(dataset: Dataset): Dataset {
  addDataset(dataset, 'People');
  return activeDataset.value as Dataset;
}

function context(dataset: Dataset, intents: PanelIntent[] = []): ColumnContext {
  return {
    dataset,
    view: activeView.value,
    settings: DEFAULT_SETTINGS,
    selected: selectedColumn.value,
    onIntent: (intent) => intents.push(intent),
  };
}

function ids(items: MenuItem[]): string[] {
  return items.map((item) => item.id);
}

function run(items: MenuItem[], id: string): void {
  const item = items.find((candidate) => candidate.id === id);
  if (item === undefined || 'input' in item) throw new Error(`no plain item ${id}`);
  item.run();
}

function type(items: MenuItem[], id: string, value: string): void {
  const item = items.find((candidate) => candidate.id === id);
  if (item === undefined || !('input' in item)) throw new Error(`no input item ${id}`);
  item.input.submit(value);
}

const PEOPLE = tableOf(
  ['name', 'city'],
  [
    { name: 'Anna', city: 'Göteborg' },
    { name: 'Bo', city: 'Stockholm' },
  ],
);

beforeEach(() => resetWorkspace());

describe('columnActions', () => {
  it('offers the view actions, the tools that fit, and nothing that does not', () => {
    const dataset = open(PEOPLE);
    const first = ids(columnActions(dataset.columns[0]!, context(dataset)));
    expect(first).toEqual([
      'sort-asc',
      'sort-desc',
      'filter',
      'keep-matching',
      'values',
      'count',
      'rename',
      'move-right',
      'remove',
      'tools',
    ]);
    const last = ids(columnActions(dataset.columns[1]!, context(dataset)));
    expect(last).toContain('move-left');
    expect(last).not.toContain('move-right');
  });

  it('cannot remove or move the only column', () => {
    const dataset = open(listOf('a'));
    const items = ids(columnActions(dataset.columns[0]!, context(dataset)));
    expect(items).not.toContain('remove');
    expect(items).not.toContain('move-left');
    expect(items).not.toContain('move-right');
  });

  it('sorts the view and never the list, until asked to make it permanent', () => {
    const dataset = open(PEOPLE);
    const column = dataset.columns[0]!;
    run(columnActions(column, context(dataset)), 'sort-desc');
    expect(viewSort.value).toEqual({ columnId: 'name', direction: 'desc' });
    expect(activeDataset.value?.rows[0]?.cells['name']).toBe('Anna');
    expect(activeHistory.value?.entries).toHaveLength(0);

    const sorted = columnActions(column, context(dataset));
    expect(ids(sorted)).toContain('sort-clear');
    expect(ids(sorted)).toContain('sort-permanent');
    run(sorted, 'sort-permanent');
    expect(activeDataset.value?.rows[0]?.cells['name']).toBe('Bo');
    expect(activeHistory.value?.entries[0]?.step.toolId).toBe('sort');
    expect(activeHistory.value?.entries[0]?.step.options['direction']).toBe('desc');
  });

  it('filters the view on what is typed, and clears it', () => {
    const dataset = open(PEOPLE);
    const column = dataset.columns[1]!;
    type(columnActions(column, context(dataset)), 'filter', 'holm');
    expect(viewFilter.value).toEqual({ columnId: 'city', value: 'holm', mode: 'contains' });
    const filtered = columnActions(column, context(dataset));
    expect(ids(filtered)).toContain('filter-clear');
    run(filtered, 'filter-clear');
    expect(viewFilter.value).toBeNull();
    type(columnActions(column, context(dataset)), 'filter', '   ');
    expect(viewFilter.value).toBeNull();
  });

  it('opens Filter rows on the filter the view already shows', () => {
    const dataset = open(PEOPLE);
    setViewFilter({ columnId: 'city', value: 'holm', mode: 'contains' });
    const intents: PanelIntent[] = [];
    run(columnActions(dataset.columns[1]!, context(dataset, intents)), 'keep-matching');
    expect(intents[0]).toMatchObject({
      kind: 'tool',
      options: { column: 'city', mode: 'contains', pattern: 'holm' },
    });
    expect(intents[0]?.kind === 'tool' && intents[0].tool.id).toBe('filter-rows');
  });

  it('renames, moves and removes through the ordinary tools, as steps', () => {
    const dataset = open(PEOPLE);
    type(columnActions(dataset.columns[0]!, context(dataset)), 'rename', ' Namn ');
    expect(activeDataset.value?.columns[0]?.name).toBe('Namn');
    expect(activeHistory.value?.entries[0]?.step.toolId).toBe('rename-column');

    const renamed = activeDataset.value as Dataset;
    run(columnActions(renamed.columns[0]!, context(renamed)), 'move-right');
    expect(activeDataset.value?.columns.map((column) => column.id)).toEqual(['city', 'name']);

    const moved = activeDataset.value as Dataset;
    run(columnActions(moved.columns[0]!, context(moved)), 'remove');
    expect(activeDataset.value?.columns.map((column) => column.id)).toEqual(['name']);
    expect(activeHistory.value?.entries).toHaveLength(3);
  });

  it('leaves the name alone when the new one is blank or the same', () => {
    const dataset = open(PEOPLE);
    type(columnActions(dataset.columns[0]!, context(dataset)), 'rename', '  ');
    type(columnActions(dataset.columns[0]!, context(dataset)), 'rename', 'name');
    expect(activeHistory.value?.entries).toHaveLength(0);
  });

  it('counts on the column, and back on the whole row', () => {
    const dataset = open(PEOPLE);
    run(columnActions(dataset.columns[0]!, context(dataset)), 'count');
    expect(selectedColumn.value).toBe('name');
    const counting = columnActions(dataset.columns[0]!, context(dataset));
    expect(counting.find((item) => item.id === 'count')?.label).toBe('Count on the whole row');
    run(counting, 'count');
    expect(selectedColumn.value).toBeNull();
  });

  it('asks the panel for the column values and the column tools', () => {
    const dataset = open(PEOPLE);
    const intents: PanelIntent[] = [];
    run(columnActions(dataset.columns[1]!, context(dataset, intents)), 'values');
    run(columnActions(dataset.columns[1]!, context(dataset, intents)), 'tools');
    expect(intents).toEqual([
      { kind: 'column-values', columnId: 'city' },
      { kind: 'column-tools', columnId: 'city' },
    ]);
  });
});

describe('makeSortPermanent', () => {
  it('does nothing when the view is not sorted', () => {
    const dataset = open(PEOPLE);
    expect(makeSortPermanent(dataset, EMPTY_VIEW, DEFAULT_SETTINGS)).toBe(false);
    expect(activeHistory.value?.entries).toHaveLength(0);
  });

  it('sorts with the settings the view sorted with', () => {
    const dataset = open(PEOPLE);
    setViewSort({ columnId: 'city', direction: 'asc' });
    expect(makeSortPermanent(dataset, activeView.value, { ...DEFAULT_SETTINGS, sortLocale: 'en' })).toBe(true);
    const step = activeHistory.value?.entries[0]?.step;
    expect(step?.options).toMatchObject({ column: 'city', direction: 'asc', locale: 'en' });
  });
});
