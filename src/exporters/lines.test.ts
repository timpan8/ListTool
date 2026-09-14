import { describe, expect, it } from 'vitest';
import { linesExporter } from './lines';
import { draftDataset, makeRow, valuesDataset, VALUE_COLUMN } from '../core/model';

const parseRef = { parserId: 'lines', options: {} };
const list = valuesDataset(['alpha', 'beta', 'gamma'], 'Value', '', parseRef);

const table = draftDataset({
  columns: [
    { id: 'first', name: 'First' },
    { id: 'email', name: 'Email' },
  ],
  rows: [
    makeRow(0, { first: 'Anna', email: 'anna@example.com' }),
    makeRow(1, { first: 'Bo', email: 'bo@example.com' }),
  ],
});

describe('lines exporter', () => {
  it('writes one value per line', () => {
    expect(linesExporter.render(list, {})).toBe('alpha\nbeta\ngamma');
  });

  it('uses the first column when none is chosen', () => {
    expect(linesExporter.render(table, {})).toBe('Anna\nBo');
  });

  it('uses the chosen column', () => {
    expect(linesExporter.render(table, { column: 'email' })).toBe(
      'anna@example.com\nbo@example.com',
    );
  });

  it('falls back to the first column when the chosen one is gone', () => {
    expect(linesExporter.render(table, { column: 'removed' })).toBe('Anna\nBo');
  });

  it('is empty for an empty list', () => {
    expect(linesExporter.render(valuesDataset([], 'Value', '', parseRef), {})).toBe('');
  });

  it('keeps blank values as blank lines', () => {
    const withBlank = valuesDataset(['a', '', 'b'], 'Value', '', parseRef);
    expect(linesExporter.render(withBlank, {})).toBe('a\n\nb');
  });

  it('writes nothing for a dataset with no columns at all', () => {
    expect(linesExporter.render(draftDataset({ columns: [], rows: [] }), {})).toBe('');
  });

  it('offers no file extension, so it is clipboard text', () => {
    expect(linesExporter.extension).toBeUndefined();
  });

  it('renders from the dataset, not from any filtered view', () => {
    expect(linesExporter.render(list, { column: VALUE_COLUMN }).split('\n')).toHaveLength(3);
  });
});
