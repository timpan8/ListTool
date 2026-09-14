import { describe, expect, it } from 'vitest';
import { markdownExporter } from './markdown';
import { listOf, tableOf } from '../test/fixtures';

const table = tableOf(
  ['first', 'email'],
  [{ first: 'Anna', email: 'a@example.com' }, { first: 'Bo', email: 'b@example.com' }],
);

describe('markdown exporter', () => {
  it('writes a Markdown table with a separator row', () => {
    const lines = markdownExporter.render(table, {}).split('\n');
    expect(lines[0]).toBe('| first | email |');
    expect(lines[1]).toBe('| --- | --- |');
    expect(lines[2]).toBe('| Anna | a@example.com |');
  });

  it('leaves the header out when asked', () => {
    expect(markdownExporter.render(table, { header: false }).split('\n')[0]).toBe(
      '| Anna | a@example.com |',
    );
  });

  it('escapes a pipe inside a value', () => {
    expect(markdownExporter.render(listOf('a|b'), { header: false })).toBe('| a\\|b |');
  });

  it('turns a newline inside a value into a break', () => {
    expect(markdownExporter.render(listOf('a\nb'), { header: false })).toBe('| a<br>b |');
  });

  it('writes HTML when asked', () => {
    const html = markdownExporter.render(table, { flavour: 'html' });
    expect(html.startsWith('<table>')).toBe(true);
    expect(html).toContain('<th>first</th>');
    expect(html).toContain('<td>Anna</td>');
  });

  it('escapes HTML so a value cannot break out of its cell', () => {
    const html = markdownExporter.render(listOf('<script>'), { flavour: 'html', header: false });
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  it('writes an empty table body for an empty list', () => {
    expect(markdownExporter.render(listOf(), { header: false })).toBe('');
  });
});

describe('markdown column selection', () => {
  it('writes only the chosen columns', () => {
    expect(markdownExporter.render(table, { columns: ['first'] }).split('\n')[0]).toBe('| first |');
  });

  it('narrows the HTML table too', () => {
    const html = markdownExporter.render(table, { columns: ['first'], flavour: 'html' });
    expect(html).toContain('<th>first</th>');
    expect(html).not.toContain('<th>email</th>');
  });
});
