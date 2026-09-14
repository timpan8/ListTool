import { describe, expect, it } from 'vitest';
import { csvParser } from './csv';
import { cell } from '../core/model';
import { COMMA_LINE, CSV_CRLF, CSV_WITH_HEADER, TAB_TABLE, THREE_LINES } from '../test/fixtures';

describe('csv parser', () => {
  it('names columns from the header row and keeps c-ids', () => {
    const dataset = csvParser.parse(CSV_WITH_HEADER, { header: true });
    expect(dataset.columns).toEqual([
      { id: 'c1', name: 'name' },
      { id: 'c2', name: 'email' },
    ]);
  });

  it('leaves the header row out of the rows', () => {
    const dataset = csvParser.parse(CSV_WITH_HEADER, { header: true });
    expect(dataset.rows).toHaveLength(2);
    expect(cell(dataset.rows[0]!, 'c1')).toBe('Andersson, Anna');
  });

  it('keeps a comma inside quotes out of the split', () => {
    const dataset = csvParser.parse(CSV_WITH_HEADER, { header: true });
    expect(cell(dataset.rows[0]!, 'c2')).toBe('anna@example.com');
  });

  it('keeps Swedish characters intact', () => {
    const dataset = csvParser.parse(CSV_WITH_HEADER, { header: true });
    expect(cell(dataset.rows[1]!, 'c1')).toBe('Åsa Öberg');
  });

  it('numbers columns when there is no header', () => {
    const dataset = csvParser.parse(CSV_WITH_HEADER, { header: false });
    expect(dataset.columns.map((column) => column.name)).toEqual(['Column 1', 'Column 2']);
    expect(dataset.rows).toHaveLength(3);
  });

  it('numbers a column whose header cell is blank', () => {
    const dataset = csvParser.parse('name,\nAnna,x', { header: true });
    expect(dataset.columns.map((column) => column.name)).toEqual(['name', 'Column 2']);
  });

  it('handles CRLF and a trailing newline', () => {
    const dataset = csvParser.parse(CSV_CRLF, { header: true });
    expect(dataset.rows).toHaveLength(2);
    expect(cell(dataset.rows[1]!, 'c1')).toBe('Bo');
  });

  it('reads tab-separated text when told to', () => {
    const dataset = csvParser.parse(TAB_TABLE, { delimiter: '\t', header: true });
    expect(dataset.columns.map((column) => column.name)).toEqual(['first', 'last', 'email']);
    expect(dataset.rows).toHaveLength(2);
  });

  it('detects the delimiter itself when asked to', () => {
    const dataset = csvParser.parse(TAB_TABLE, { delimiter: '', header: true });
    expect(dataset.columns).toHaveLength(3);
  });

  it('pads a short row instead of leaving cells missing', () => {
    const dataset = csvParser.parse('a,b,c\n1,2', { header: true });
    expect(cell(dataset.rows[0]!, 'c3')).toBe('');
  });

  it('is empty for empty input', () => {
    expect(csvParser.parse('', { header: true }).rows).toEqual([]);
  });

  it('survives a header-only file', () => {
    const dataset = csvParser.parse('name,email', { header: true });
    expect(dataset.rows).toEqual([]);
    expect(dataset.columns.map((column) => column.name)).toEqual(['name', 'email']);
  });

  it('keeps the original input for re-parsing', () => {
    const dataset = csvParser.parse(CSV_WITH_HEADER, { header: true });
    expect(dataset.rawInput).toBe(CSV_WITH_HEADER);
    expect(dataset.parse).toEqual({ parserId: 'csv', options: { header: true } });
  });
});

describe('csv detection', () => {
  it('claims multi-line delimited text', () => {
    expect(csvParser.detect(CSV_WITH_HEADER)).toEqual({
      confidence: 0.8,
      options: { delimiter: ',', header: true },
    });
  });

  it('leaves a single delimited line to the Delimited parser', () => {
    expect(csvParser.detect(COMMA_LINE)).toBeNull();
  });

  it('declines lines with no delimiter', () => {
    expect(csvParser.detect(THREE_LINES)).toBeNull();
  });
});
