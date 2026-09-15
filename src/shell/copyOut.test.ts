import { describe, expect, it } from 'vitest';
import { copyNotice, renderView } from './copyOut';
import { DEFAULT_SETTINGS } from '../core/settings';
import { EMPTY_VIEW, type ViewState } from '../core/view';
import { exporterById } from '../exporters';
import type { Exporter } from '../core/registry';
import { listOf, tableOf } from '../test/fixtures';

const PEOPLE = tableOf(
  ['name', 'city'],
  [
    { name: 'Anna', city: 'Göteborg' },
    { name: 'Bo', city: 'Stockholm' },
    { name: 'Carl', city: 'Göteborg' },
  ],
);
const [anna, , carl] = PEOPLE.rows.map((row) => row.id) as [string, string, string];

const exporter = (id: string): Exporter => exporterById(id) as Exporter;

describe('renderView', () => {
  it('renders a table as tab-separated text with a header, and as an HTML table', () => {
    const rendered = renderView(PEOPLE, EMPTY_VIEW, DEFAULT_SETTINGS);
    expect(rendered.exporter.id).toBe('tsv');
    expect(rendered.scope).toBe('shown');
    expect(rendered.text).toBe('name\tcity\nAnna\tGöteborg\nBo\tStockholm\nCarl\tGöteborg');
    expect(rendered.html).toContain('<table>');
    expect(rendered.html).toContain('<td>Stockholm</td>');
  });

  it('renders a plain list as lines', () => {
    const rendered = renderView(listOf('a', 'b'), EMPTY_VIEW, DEFAULT_SETTINGS);
    expect(rendered.exporter.id).toBe('lines');
    expect(rendered.text).toBe('a\nb');
  });

  it('takes only the rows the search shows', () => {
    const view: ViewState = { ...EMPTY_VIEW, query: 'stock' };
    const rendered = renderView(PEOPLE, view, DEFAULT_SETTINGS);
    expect(rendered.text).toBe('name\tcity\nBo\tStockholm');
    expect(rendered.dataset.rows).toHaveLength(1);
  });

  it('takes the ticked rows before anything else', () => {
    const view: ViewState = { ...EMPTY_VIEW, query: 'stock', ticked: [anna, carl] };
    const rendered = renderView(PEOPLE, view, DEFAULT_SETTINGS);
    expect(rendered.scope).toBe('ticked');
    expect(rendered.text).toBe('name\tcity\nAnna\tGöteborg\nCarl\tGöteborg');
  });

  it('follows the order the view shows', () => {
    const view: ViewState = { ...EMPTY_VIEW, sort: { columnId: 'name', direction: 'desc' } };
    expect(renderView(PEOPLE, view, DEFAULT_SETTINGS).text).toBe(
      'name\tcity\nCarl\tGöteborg\nBo\tStockholm\nAnna\tGöteborg',
    );
  });

  it('uses the format asked for, over the shown rows', () => {
    const view: ViewState = { ...EMPTY_VIEW, query: 'göteborg' };
    const rendered = renderView(PEOPLE, view, DEFAULT_SETTINGS, 'csv');
    expect(rendered.exporter.id).toBe('csv');
    expect(rendered.text).toBe('name,city\nAnna,Göteborg\nCarl,Göteborg');
  });

  it('falls back to the shape of the list when the format is unknown', () => {
    expect(renderView(PEOPLE, EMPTY_VIEW, DEFAULT_SETTINGS, 'nope').exporter.id).toBe('tsv');
  });

  it('never touches the dataset it renders', () => {
    const before = JSON.stringify(PEOPLE);
    renderView(PEOPLE, { ...EMPTY_VIEW, sort: { columnId: 'city', direction: 'asc' } }, DEFAULT_SETTINGS);
    expect(JSON.stringify(PEOPLE)).toBe(before);
  });
});

describe('copyNotice', () => {
  it('says how many rows were shown and that they went as a table', () => {
    expect(copyNotice(true, PEOPLE, 'shown', exporter('tsv'))).toBe(
      'Copied the 3 rows shown as a table with 2 columns',
    );
  });

  it('says when the ticked rows were what went', () => {
    const one = { ...PEOPLE, rows: PEOPLE.rows.slice(0, 1) };
    expect(copyNotice(true, one, 'ticked', exporter('tsv'))).toBe(
      'Copied the 1 ticked row as a table with 2 columns',
    );
  });

  it('names the format when it is not a table', () => {
    expect(copyNotice(true, PEOPLE, 'all', exporter('json'))).toBe(
      'Copied all 3 rows as JSON array',
    );
    expect(copyNotice(true, listOf('a', 'b'), 'shown', exporter('lines'))).toBe(
      'Copied the 2 rows shown as Lines',
    );
  });

  it('says so when the clipboard refused', () => {
    expect(copyNotice(false, PEOPLE, 'shown', exporter('tsv'))).toMatch(/Could not copy/);
  });
});
