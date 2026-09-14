import { describe, expect, it } from 'vitest';
import {
  appliedSteps,
  canRedo,
  canUndo,
  createHistory,
  current,
  pushStep,
  redo,
  renameDataset,
  undo,
  type Step,
} from './history';
import { valuesDataset, VALUE_COLUMN, cell } from './model';

const parseRef = { parserId: 'lines', options: {} };

function listOf(...values: string[]) {
  return { ...valuesDataset(values, 'Value', values.join('\n'), parseRef), id: 'd1', name: 'A' };
}

function step(summary: string): Step {
  return { toolId: 'trim', options: {}, summary, at: 0 };
}

function valuesOf(dataset: ReturnType<typeof listOf>): string[] {
  return dataset.rows.map((row) => cell(row, VALUE_COLUMN));
}

describe('history', () => {
  it('starts on the initial dataset with nothing to undo or redo', () => {
    const history = createHistory(listOf('a', 'b'));
    expect(valuesOf(current(history))).toEqual(['a', 'b']);
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });

  it('shows the snapshot after the last step', () => {
    const history = pushStep(createHistory(listOf('a')), step('one'), listOf('A'));
    expect(valuesOf(current(history))).toEqual(['A']);
    expect(canUndo(history)).toBe(true);
    expect(canRedo(history)).toBe(false);
  });

  it('undo returns the previous snapshot and redo moves forward again', () => {
    let history = createHistory(listOf('a'));
    history = pushStep(history, step('one'), listOf('b'));
    history = pushStep(history, step('two'), listOf('c'));

    history = undo(history);
    expect(valuesOf(current(history))).toEqual(['b']);
    history = undo(history);
    expect(valuesOf(current(history))).toEqual(['a']);
    expect(canUndo(history)).toBe(false);

    history = redo(history);
    expect(valuesOf(current(history))).toEqual(['b']);
    history = redo(history);
    expect(valuesOf(current(history))).toEqual(['c']);
    expect(canRedo(history)).toBe(false);
  });

  it('undo past the start and redo past the end do nothing', () => {
    const history = createHistory(listOf('a'));
    expect(current(undo(history))).toBe(current(history));
    expect(current(redo(history))).toBe(current(history));
  });

  it('applying a step after undo drops the redo tail', () => {
    let history = createHistory(listOf('a'));
    history = pushStep(history, step('one'), listOf('b'));
    history = pushStep(history, step('two'), listOf('c'));
    history = undo(history);
    history = pushStep(history, step('three'), listOf('d'));

    expect(valuesOf(current(history))).toEqual(['d']);
    expect(canRedo(history)).toBe(false);
    expect(appliedSteps(history).map((entry) => entry.summary)).toEqual(['one', 'three']);
  });

  it('lists only the steps that led to what is on screen', () => {
    let history = createHistory(listOf('a'));
    history = pushStep(history, step('one'), listOf('b'));
    history = pushStep(history, step('two'), listOf('c'));
    expect(appliedSteps(undo(history)).map((entry) => entry.summary)).toEqual(['one']);
  });

  it('never mutates the history it is given', () => {
    const history = createHistory(listOf('a'));
    const before = JSON.stringify(history);
    pushStep(history, step('one'), listOf('b'));
    undo(history);
    redo(history);
    renameDataset(history, 'Renamed');
    expect(JSON.stringify(history)).toBe(before);
  });

  it('renaming reaches every snapshot, so undo cannot resurrect the old name', () => {
    let history = createHistory(listOf('a'));
    history = pushStep(history, step('one'), listOf('b'));
    history = renameDataset(history, 'Recipients');

    expect(current(history).name).toBe('Recipients');
    expect(current(undo(history)).name).toBe('Recipients');
  });

  it('renaming records no step', () => {
    const history = renameDataset(createHistory(listOf('a')), 'Recipients');
    expect(canUndo(history)).toBe(false);
    expect(appliedSteps(history)).toEqual([]);
  });
});
