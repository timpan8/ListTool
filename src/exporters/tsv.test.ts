import { describe, expect, it } from 'vitest';
import { tsvExporter } from './tsv';
import { draftDataset, makeRow } from '../core/model';

const table = draftDataset({
  columns: [
    { id: 'c1', name: 'name' },
    { id: 'c2', name: 'email' },
  ],
  rows: [makeRow(0, { c1: 'Anna', c2: 'anna@example.com' })],
});

describe('tsv exporter', () => {
  it('separates columns with tabs', () => {
    expect(tsvExporter.render(table, { header: false })).toBe('Anna\tanna@example.com');
  });

  it('writes a header row by default', () => {
    expect(tsvExporter.render(table, {}).split('\n')[0]).toBe('name\temail');
  });

  it('does not quote a comma, because a comma is not the delimiter here', () => {
    const commas = draftDataset({
      columns: [{ id: 'c1', name: 'name' }],
      rows: [makeRow(0, { c1: 'Andersson, Anna' })],
    });
    expect(tsvExporter.render(commas, { header: false })).toBe('Andersson, Anna');
  });

  it('quotes a value that contains a tab', () => {
    const tabbed = draftDataset({
      columns: [{ id: 'c1', name: 'name' }],
      rows: [makeRow(0, { c1: 'a\tb' })],
    });
    expect(tsvExporter.render(tabbed, { header: false })).toBe('"a\tb"');
  });

  it('offers a file extension', () => {
    expect(tsvExporter.extension).toBe('tsv');
  });
});

describe('tsv column selection', () => {
  it('writes only the chosen columns', () => {
    expect(tsvExporter.render(table, { columns: ['c2'], header: false })).toBe(
      'anna@example.com',
    );
  });
});
