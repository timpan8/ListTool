import { describe, expect, it } from 'vitest';
import { htmlTableParser } from './html-table';
import { cell } from '../core/model';
import { EXCEL_HTML } from '../test/fixtures';

function parse(input: string, options: Record<string, unknown> = { header: 'auto' }) {
  return htmlTableParser.parse(input, options);
}

describe('html table parser', () => {
  it('reads what Excel actually puts on the clipboard', () => {
    const dataset = parse(EXCEL_HTML);

    expect(dataset.columns.map((column) => column.name)).toEqual(['Namn', 'E-post']);
    expect(dataset.rows).toHaveLength(2);
    expect(cell(dataset.rows[0]!, 'c1')).toBe('Andersson, Anna');
    expect(cell(dataset.rows[0]!, 'c2')).toBe('anna@example.com');
  });

  it('decodes named and numeric entities, including Swedish characters', () => {
    expect(cell(parse(EXCEL_HTML).rows[1]!, 'c1')).toBe('Åsa Öberg');
  });

  it('takes the text out of a link rather than the markup', () => {
    const html = '<table><tr><td><a href="https://example.com">Example</a></td></tr></table>';
    expect(cell(parse(html).rows[0]!, 'c1')).toBe('Example');
  });

  it('treats a row of th cells as the header, and a row of td cells as data', () => {
    const withHeader = parse('<table><tr><th>a</th></tr><tr><td>1</td></tr></table>');
    expect(withHeader.columns[0]?.name).toBe('a');
    expect(withHeader.rows).toHaveLength(1);

    const without = parse('<table><tr><td>1</td></tr><tr><td>2</td></tr></table>');
    expect(without.columns[0]?.name).toBe('Column 1');
    expect(without.rows).toHaveLength(2);
  });

  it('can be told to use the first row as a header, or not to', () => {
    const html = '<table><tr><td>a</td></tr><tr><td>1</td></tr></table>';
    expect(parse(html, { header: 'yes' }).columns[0]?.name).toBe('a');
    expect(parse(EXCEL_HTML, { header: 'no' }).rows).toHaveLength(3);
  });

  it('turns a line break inside a cell into a newline', () => {
    const html = '<table><tr><td>one<br>two</td></tr></table>';
    expect(cell(parse(html).rows[0]!, 'c1')).toBe('one\ntwo');
  });

  it('keeps the columns lined up under a spanned cell', () => {
    const html =
      '<table><tr><td colspan="2">wide</td><td>c</td></tr><tr><td>1</td><td>2</td><td>3</td></tr></table>';
    const dataset = parse(html, { header: 'no' });

    expect(dataset.columns).toHaveLength(3);
    expect(cell(dataset.rows[0]!, 'c3')).toBe('c');
    expect(cell(dataset.rows[1]!, 'c3')).toBe('3');
  });

  it('fills a short row out rather than dropping the cell', () => {
    const html = '<table><tr><td>a</td><td>b</td></tr><tr><td>c</td></tr></table>';
    const dataset = parse(html, { header: 'no' });
    expect(cell(dataset.rows[1]!, 'c2')).toBe('');
  });

  it('ignores a comment and the markup around the table', () => {
    const html = '<div><!-- <td>ghost</td> --><table><tr><td>real</td></tr></table></div>';
    const dataset = parse(html);
    expect(dataset.rows).toHaveLength(1);
    expect(cell(dataset.rows[0]!, 'c1')).toBe('real');
  });

  it('keeps the original markup so the list can be re-parsed', () => {
    expect(parse(EXCEL_HTML).rawInput).toBe(EXCEL_HTML);
    expect(parse(EXCEL_HTML).parse?.parserId).toBe('html-table');
  });

  it('produces an empty list from markup with no table in it', () => {
    const dataset = parse('<p>no table here</p>');
    expect(dataset.rows).toEqual([]);
    expect(dataset.columns).toEqual([]);
  });
});

describe('html table detection', () => {
  it('claims markup that holds a table', () => {
    expect(htmlTableParser.detect(EXCEL_HTML)?.confidence).toBeGreaterThan(0.9);
  });

  it('claims nothing else, so plain text still reaches the other parsers', () => {
    expect(htmlTableParser.detect('a,b,c')).toBeNull();
    expect(htmlTableParser.detect('<p>hello</p>')).toBeNull();
    expect(htmlTableParser.detect('')).toBeNull();
  });
});
