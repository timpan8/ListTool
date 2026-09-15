import { describe, expect, it } from 'vitest';
import { copyExporter, exporterById, exporters, isTableExporter } from './index';
import { defaultOptions } from '../core/registry';
import { draftDataset, makeRow, valuesDataset } from '../core/model';
import { tableOf } from '../test/fixtures';

const list = valuesDataset(['a', 'b'], 'Value', '', { parserId: 'lines', options: {} });
const empty = draftDataset({ columns: [], rows: [] });
const table = tableOf(['first', 'email'], [{ first: 'Anna', email: 'anna@example.com' }]);

describe('copyExporter', () => {
  it('copies a table as a table, with the HTML flavour Excel needs', () => {
    const exporter = copyExporter(table);
    expect(exporter.id).toBe('tsv');
    expect(exporter.html).toBeDefined();
  });

  it('copies a plain list as lines', () => {
    expect(copyExporter(list).id).toBe('lines');
  });

  it('copies a list with no columns at all as lines rather than failing', () => {
    expect(copyExporter(empty).id).toBe('lines');
  });
});

describe('isTableExporter', () => {
  it('is true exactly for the exporters that ask which columns to write', () => {
    const table = exporters.filter(isTableExporter).map((exporter) => exporter.id);
    expect(table.sort()).toEqual(['csv', 'markdown', 'tsv']);
  });

  it('leaves one-column and text formats in the other group', () => {
    for (const id of ['lines', 'json', 'template', 'recipients', 'sql-in']) {
      const exporter = exporterById(id);
      expect(exporter).toBeDefined();
      expect(isTableExporter(exporter as NonNullable<typeof exporter>)).toBe(false);
    }
  });
});

describe('exporter registry', () => {
  it('has unique ids', () => {
    const ids = exporters.map((exporter) => exporter.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('looks exporters up by id', () => {
    expect(exporterById('csv')?.name).toBe('CSV');
    expect(exporterById('nope')).toBeUndefined();
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

  it('renders the same string twice, for every exporter', () => {
    for (const exporter of exporters) {
      const options = defaultOptions(exporter.options);
      expect(exporter.render(list, options)).toBe(exporter.render(list, options));
    }
  });

  it('offers HTML that is a table, for every exporter that offers any', () => {
    for (const exporter of exporters) {
      const html = exporter.html?.(list, defaultOptions(exporter.options));
      if (html === undefined) continue;
      expect(html).toContain('<table>');
      expect(html).toContain('</table>');
    }
  });

  it('survives an empty dataset in its HTML form too', () => {
    for (const exporter of exporters) {
      expect(() => exporter.html?.(empty, defaultOptions(exporter.options))).not.toThrow();
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
      exporter.html?.(dataset, defaultOptions(exporter.options));
    }
    expect(JSON.stringify(dataset)).toBe(before);
  });
});
