import { describe, expect, it } from 'vitest';
import { DEFAULT_EXPORTER_ID, exporterById, exporters } from './index';
import { defaultOptions } from '../core/registry';
import { draftDataset, makeRow, valuesDataset } from '../core/model';

const list = valuesDataset(['a', 'b'], 'Value', '', { parserId: 'lines', options: {} });
const empty = draftDataset({ columns: [], rows: [] });

describe('exporter registry', () => {
  it('has unique ids', () => {
    const ids = exporters.map((exporter) => exporter.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('looks exporters up by id', () => {
    expect(exporterById('csv')?.name).toBe('CSV');
    expect(exporterById('nope')).toBeUndefined();
  });

  it('has the exporter Copy falls back to', () => {
    expect(exporterById(DEFAULT_EXPORTER_ID)).toBeDefined();
  });

  it('gives every exporter a name and labelled options', () => {
    for (const exporter of exporters) {
      expect(exporter.name.trim()).not.toBe('');
      for (const field of exporter.options) {
        expect(field.label.trim()).not.toBe('');
      }
    }
  });

  it('renders a string from its own defaults, for every exporter', () => {
    for (const exporter of exporters) {
      expect(typeof exporter.render(list, defaultOptions(exporter.options))).toBe('string');
    }
  });

  it('survives an empty dataset, for every exporter', () => {
    for (const exporter of exporters) {
      expect(() => exporter.render(empty, defaultOptions(exporter.options))).not.toThrow();
    }
  });

  it('never mutates the dataset it renders', () => {
    const dataset = draftDataset({
      columns: [{ id: 'c1', name: 'name' }],
      rows: [makeRow(0, { c1: 'Anna' })],
    });
    const before = JSON.stringify(dataset);
    for (const exporter of exporters) {
      exporter.render(dataset, defaultOptions(exporter.options));
    }
    expect(JSON.stringify(dataset)).toBe(before);
  });
});
