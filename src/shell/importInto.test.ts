import { beforeEach, describe, expect, it } from 'vitest';
import { importInto } from './importInto';
import {
  activeDataset,
  activeHistory,
  addDataset,
  openDatasets,
  resetWorkspace,
  undo,
} from '../core/store';
import { cell, valuesDataset, VALUE_COLUMN } from '../core/model';
import { linesParser } from '../parsers/lines';

function list(...values: string[]) {
  return valuesDataset(values, 'Value', values.join('\n'), { parserId: 'lines', options: {} });
}

function values(): string[] {
  return (activeDataset.value?.rows ?? []).map((row) => cell(row, VALUE_COLUMN));
}

const NOWHERE = { reparse: null, appendTo: null, name: 'New' };

beforeEach(() => {
  resetWorkspace();
});

describe('importInto', () => {
  it('opens a new list when nothing else was chosen', () => {
    importInto(list('a', 'b'), linesParser, {}, NOWHERE);
    expect(openDatasets.value.map((dataset) => dataset.name)).toEqual(['New']);
    expect(values()).toEqual(['a', 'b']);
  });

  it('adds to the end of an open list', () => {
    addDataset(list('a'), 'A');
    importInto(list('b', 'c'), linesParser, {}, { ...NOWHERE, appendTo: activeDataset.value });

    expect(openDatasets.value).toHaveLength(1);
    expect(values()).toEqual(['a', 'b', 'c']);
  });

  it('makes adding one undoable step, not a quiet write', () => {
    const id = addDataset(list('a'), 'A');
    importInto(list('b'), linesParser, {}, { ...NOWHERE, appendTo: activeDataset.value });
    expect(activeHistory.value?.entries[0]?.step.toolId).toBe('append-rows');
    undo(id);
    expect(values()).toEqual(['a']);
  });

  it('replaces a list when re-parsing it, and says which parser read it', () => {
    addDataset(list('a'), 'A');
    importInto(list('x', 'y'), linesParser, {}, { ...NOWHERE, reparse: activeDataset.value });

    expect(values()).toEqual(['x', 'y']);
    expect(activeHistory.value?.entries[0]?.step.summary).toBe('Read as Lines · 2 rows');
  });

  it('keeps the list its name and id when re-parsing', () => {
    const id = addDataset(list('a'), 'A');
    importInto(list('x'), linesParser, {}, { ...NOWHERE, reparse: activeDataset.value });
    expect([activeDataset.value?.id, activeDataset.value?.name]).toEqual([id, 'A']);
  });

  it('re-parsing wins over appending when both are somehow set', () => {
    addDataset(list('a'), 'A');
    const open = activeDataset.value;
    importInto(list('x'), linesParser, {}, { ...NOWHERE, reparse: open, appendTo: open });
    expect(values()).toEqual(['x']);
  });
});
