import { describe, expect, it } from 'vitest';
import { fixMojibakeTool } from './fix-mojibake';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const ALL = { column: '' };

function fix(...values: string[]): string[] {
  return fixMojibakeTool
    .run(listOf(...values), ALL)
    .output.rows.map((row) => cell(row, VALUE_COLUMN));
}

describe('fix mojibake tool', () => {
  it('repairs Swedish characters read as Latin-1', () => {
    expect(fix('Ã…sa Ã–berg')).toEqual(['Åsa Öberg']);
    expect(fix('KÃ¶penhamn')).toEqual(['Köpenhamn']);
  });

  it('repairs the CP1252 range Latin-1 has no characters for', () => {
    // 'â€“' is an en dash written as UTF-8 and read as CP1252.
    expect(fix('2024â€“2025')).toEqual(['2024–2025']);
  });

  it('leaves text that was decoded correctly exactly as it is', () => {
    expect(fix('Åsa Öberg', 'plain ascii', 'anna@example.com')).toEqual([
      'Åsa Öberg',
      'plain ascii',
      'anna@example.com',
    ]);
  });

  it('leaves a value whose bytes are not valid UTF-8 alone', () => {
    expect(fix('Ã')).toEqual(['Ã']);
  });

  it('leaves empty cells alone', () => {
    expect(fix('')).toEqual(['']);
  });

  it('reports nothing changed rather than pretending it worked', () => {
    const result = fixMojibakeTool.run(listOf('Åsa'), ALL);
    expect(result.summary).toBe('Nothing changed.');
    expect(result.warnings?.[0]).toContain('Nothing looks mis-decoded');
  });

  it('counts the cells it repaired', () => {
    const result = fixMojibakeTool.run(listOf('Ã…sa', 'Bo'), ALL);
    expect(result.summary).toBe('Repaired 1 cell');
    expect(result.stats).toEqual({ changed: 1 });
  });

  it('works on one column without touching the others', () => {
    const dataset = tableOf(['a', 'b'], [{ a: 'Ã…sa', b: 'Ã…sa' }]);
    const output = fixMojibakeTool.run(dataset, { column: 'a' }).output;
    expect([cell(output.rows[0]!, 'a'), cell(output.rows[0]!, 'b')]).toEqual(['Åsa', 'Ã…sa']);
  });

  it('never mutates its input', () => {
    const dataset = listOf('Ã…sa');
    const before = JSON.stringify(dataset);
    fixMojibakeTool.run(dataset, ALL);
    expect(JSON.stringify(dataset)).toBe(before);
  });
});
