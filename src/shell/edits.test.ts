import { beforeEach, describe, expect, it } from 'vitest';
import { applyTool, editCell } from './edits';
import { activeDataset, addDataset, resetWorkspace, undo } from '../core/store';
import { activeHistory } from '../core/store';
import { cell, valuesDataset, VALUE_COLUMN } from '../core/model';

function list(...values: string[]) {
  return valuesDataset(values, 'Value', values.join('\n'), { parserId: 'lines', options: {} });
}

function values(): string[] {
  return (activeDataset.value?.rows ?? []).map((row) => cell(row, VALUE_COLUMN));
}

beforeEach(() => {
  resetWorkspace();
});

describe('editCell', () => {
  it('writes the new value into the list', () => {
    addDataset(list('a', 'b'), 'A');
    expect(editCell(activeDataset.value!, 'r2', VALUE_COLUMN, 'x')).toBe(true);
    expect(values()).toEqual(['a', 'x']);
  });

  it('is one undoable step, like every other change', () => {
    const id = addDataset(list('a'), 'A');
    editCell(activeDataset.value!, 'r1', VALUE_COLUMN, 'x');
    undo(id);
    expect(values()).toEqual(['a']);
  });

  it('records the step under the tool that did it, so a recipe can replay it', () => {
    addDataset(list('a'), 'A');
    editCell(activeDataset.value!, 'r1', VALUE_COLUMN, 'x');
    const entry = activeHistory.value?.entries[0];
    expect(entry?.step.toolId).toBe('set-value');
    expect(entry?.step.summary).toBe('Set 1 cell to x');
  });

  it('does nothing when the value did not change', () => {
    addDataset(list('a'), 'A');
    expect(editCell(activeDataset.value!, 'r1', VALUE_COLUMN, 'a')).toBe(false);
    expect(activeHistory.value?.entries).toHaveLength(0);
  });

  it('can clear a cell', () => {
    addDataset(list('a'), 'A');
    editCell(activeDataset.value!, 'r1', VALUE_COLUMN, '');
    expect(values()).toEqual(['']);
  });
});

describe('applyTool', () => {
  it('runs any registered tool as a step', () => {
    addDataset(list(' a ', 'b'), 'A');
    expect(applyTool(activeDataset.value!, 'trim-whitespace', { column: '' })).toBe(true);
    expect(values()).toEqual(['a', 'b']);
  });

  it('reports false for a tool that does not exist', () => {
    addDataset(list('a'), 'A');
    expect(applyTool(activeDataset.value!, 'nope', {})).toBe(false);
  });

  it('reports false when the tool hands its input straight back', () => {
    addDataset(list('a'), 'A');
    expect(applyTool(activeDataset.value!, 'selected-rows', { rows: [], mode: 'keep' })).toBe(
      false,
    );
    expect(activeHistory.value?.entries).toHaveLength(0);
  });
});
