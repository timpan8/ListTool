import { describe, expect, it } from 'vitest';
import { escapeHtml, renderHtmlTable } from './html-table';
import { csvExporter } from './csv';
import { linesExporter } from './lines';
import { markdownExporter } from './markdown';
import { htmlTableParser } from '../parsers/html-table';
import { cell } from '../core/model';
import { listOf, tableOf } from '../test/fixtures';

const PEOPLE = tableOf(
  ['name', 'email'],
  [
    { name: 'Andersson, Anna', email: 'anna@example.com' },
    { name: 'Åsa Öberg', email: 'asa@example.com' },
  ],
);

describe('escapeHtml', () => {
  it('escapes what would otherwise end the cell', () => {
    expect(escapeHtml('a & b < c > "d"')).toBe('a &amp; b &lt; c &gt; &quot;d&quot;');
  });
});

describe('renderHtmlTable', () => {
  it('writes a header when asked and leaves it out when not', () => {
    expect(renderHtmlTable(PEOPLE, PEOPLE.columns, true)).toContain('<th>name</th>');
    expect(renderHtmlTable(PEOPLE, PEOPLE.columns, false)).not.toContain('<thead>');
  });

  it('writes one row per row and one cell per column', () => {
    const html = renderHtmlTable(PEOPLE, PEOPLE.columns, false);
    expect(html.match(/<tr>/g)).toHaveLength(2);
    expect(html).toContain('<td>anna@example.com</td>');
  });
});

describe('the HTML an exporter offers beside its text', () => {
  it('is a table for CSV, so a paste into Excel lands in cells', () => {
    const html = csvExporter.html?.(PEOPLE, {}) ?? '';
    expect(html).toContain('<table>');
    expect(html).toContain('<th>email</th>');
  });

  it('is a one-column table for Lines, not one cell with newlines in it', () => {
    const html = linesExporter.html?.(listOf('a', 'b'), {}) ?? '';
    expect(html.match(/<td>/g)).toHaveLength(2);
    expect(html).not.toContain('<thead>');
  });

  it('is a table for Markdown even when the text form is markdown', () => {
    expect(markdownExporter.render(PEOPLE, { flavour: 'markdown' })).toContain('| name |');
    expect(markdownExporter.html?.(PEOPLE, {})).toContain('<table>');
  });

  it('comes back as the same table when pasted into this app again', () => {
    const html = csvExporter.html?.(PEOPLE, {}) ?? '';
    const back = htmlTableParser.parse(html, { header: 'auto' });

    expect(back.columns.map((column) => column.name)).toEqual(['name', 'email']);
    expect(back.rows.map((row) => cell(row, 'c1'))).toEqual(['Andersson, Anna', 'Åsa Öberg']);
  });

  it('survives a value that would otherwise be markup', () => {
    const risky = tableOf(['a'], [{ a: '<b>bold</b> & "quoted"' }]);
    const html = csvExporter.html?.(risky, {}) ?? '';
    const back = htmlTableParser.parse(html, { header: 'no' });
    expect(cell(back.rows[1]!, 'c1')).toBe('<b>bold</b> & "quoted"');
  });

  it('is offered only by the exporters whose output is table-shaped', () => {
    expect(markdownExporter.html).toBeDefined();
    expect(csvExporter.html).toBeDefined();
  });
});
