import { beforeEach, describe, expect, it } from 'vitest';
import { selectionActions, selectionTools } from './selectionTools';
import type { PanelIntent } from './panelIntent';
import { DEFAULT_SETTINGS } from '../core/settings';
import { activeDataset, activeHistory, addDataset, resetWorkspace } from '../core/store';
import type { Dataset } from '../core/model';
import { listOf } from '../test/fixtures';

beforeEach(() => resetWorkspace());

describe('selectionTools', () => {
  it('is every registered tool that takes the ticked rows', () => {
    expect(selectionTools(listOf('a')).map((tool) => tool.id).sort()).toEqual([
      'selected-rows',
      'set-value',
    ]);
  });
});

describe('selectionActions', () => {
  it('offers a tool with presets as its presets, and one without as a way to open it', () => {
    addDataset(listOf('a', 'b', 'c'), 'One');
    const dataset = activeDataset.value as Dataset;
    const actions = selectionActions(dataset, ['r1'], DEFAULT_SETTINGS, () => undefined);
    expect(actions.map((action) => action.id)).toEqual([
      'selected-rows:keep',
      'selected-rows:remove',
      'set-value',
    ]);
    expect(actions.map((action) => action.label)).toEqual([
      'Keep only these',
      'Remove these',
      'Set value…',
    ]);
  });

  it('runs a preset on the ticked rows at once, as one step', () => {
    addDataset(listOf('a', 'b', 'c'), 'One');
    const dataset = activeDataset.value as Dataset;
    const actions = selectionActions(dataset, ['r2'], DEFAULT_SETTINGS, () => undefined);
    actions.find((action) => action.id === 'selected-rows:remove')?.run();
    expect(activeDataset.value?.rows.map((row) => row.id)).toEqual(['r1', 'r3']);
    expect(activeHistory.value?.entries[0]?.step.toolId).toBe('selected-rows');
    expect(activeHistory.value?.entries[0]?.step.options).toMatchObject({
      rows: ['r2'],
      mode: 'remove',
    });
  });

  it('opens a tool without presets on the panel, ticks and all', () => {
    addDataset(listOf('a', 'b'), 'One');
    const dataset = activeDataset.value as Dataset;
    const intents: PanelIntent[] = [];
    const actions = selectionActions(dataset, ['r1'], DEFAULT_SETTINGS, (intent) =>
      intents.push(intent),
    );
    actions.find((action) => action.id === 'set-value')?.run();
    expect(intents[0]?.kind === 'tool' && intents[0].tool.id).toBe('set-value');
  });
});
