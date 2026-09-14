import { describe, expect, it } from 'vitest';
import { csvExporter } from './csv';
import { draftDataset, makeRow, valuesDataset } from '../core/model';

const parseRef = { parserId: 'lines', options: {} };

const table = draftDataset({
  columns: [
    { id: 'c1', name: 'name' },
    { id: 'c2', name: 'email' },
  ],
  rows: [
    makeRow(0, { c1: 'Andersson, Anna', c2: 'anna@example.com' }),
    makeRow(1, { c1: 'Åsa Öberg', c2: 'asa@example.com' }),
  ],
});

describe('csv exporter', () => {
  it('writes a header row by default', () => {
    expect(csvExporter.render(table, {}).split('\n')[0]).toBe('name,email');
  });

  it('leaves the header out when asked', () => {
    expect(csvExporter.render(table, { header: false }).split('\n')[0]).toBe(
      '"Andersson, Anna",anna@example.com',
    );
  });

  it('quotes a value containing the delimiter', () => {
    expect(csvExporter.render(table, { header: false })).toContain('"Andersson, Anna"');
  });

  it('keeps Swedish characters unescaped', () => {
    expect(csvExporter.render(table, { header: false })).toContain('Åsa Öberg');
  });

  it('writes every column, not just the first', () => {
    expect(csvExporter.render(table, { header: true }).split('\n')).toHaveLength(3);
  });

  it('writes a one-column list as one value per line', () => {
    const list = valuesDataset(['a', 'b'], 'Value', '', parseRef);
    expect(csvExporter.render(list, { header: false })).toBe('a\nb');
  });

  it('quotes a value containing a quote', () => {
    const quoted = draftDataset({
      columns: [{ id: 'c1', name: 'name' }],
      rows: [makeRow(0, { c1: 'say "hi"' })],
    });
    expect(csvExporter.render(quoted, { header: false })).toBe('"say ""hi"""');
  });

  it('offers a file extension, so it can be downloaded', () => {
    expect(csvExporter.extension).toBe('csv');
  });

  it('writes only the header for a dataset with no rows', () => {
    const empty = draftDataset({ columns: [{ id: 'c1', name: 'name' }], rows: [] });
    expect(csvExporter.render(empty, { header: true })).toBe('name');
  });
});
