import { describe, expect, it } from 'vitest';
import { cleanInvisibleTool } from './clean-invisible';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf } from '../../test/fixtures';

const ALL = { column: '', spaces: true, zeroWidth: true, controls: true };

function clean(value: string, options = ALL): string {
  return cell(cleanInvisibleTool.run(listOf(value), options).output.rows[0]!, VALUE_COLUMN);
}

describe('clean invisible characters tool', () => {
  it('turns a non-breaking space into an ordinary one', () => {
    expect(clean('Anna\u00a0Andersson')).toBe('Anna Andersson');
  });

  it('turns the other Unicode spaces into ordinary ones too', () => {
    expect(clean('a\u2009b\u3000c')).toBe('a b c');
  });

  it('keeps the figure space, which is a real column-aligning width', () => {
    expect(clean('1\u2007000')).toBe('1\u2007000');
  });

  it('removes zero-width characters and the byte order mark', () => {
    expect(clean('\ufeffanna\u200b@\u200dexample.com')).toBe('anna@example.com');
  });

  it('removes a soft hyphen, which is why a search for the name never matched', () => {
    expect(clean('Ander\u00adsson')).toBe('Andersson');
  });

  it('removes control characters but keeps tab and newline', () => {
    expect(clean('a\u0000b\u0007c')).toBe('abc');
    expect(clean('a\tb\nc')).toBe('a\tb\nc');
  });

  it('leaves ordinary text and Swedish characters alone', () => {
    expect(clean('Åsa Öberg')).toBe('Åsa Öberg');
  });

  it('can be told to leave the spaces and take only the invisible ones', () => {
    expect(clean('a\u00a0b\u200bc', { ...ALL, spaces: false })).toBe('a\u00a0bc');
  });

  it('can be told to leave the zero-width ones', () => {
    expect(clean('a\u200bb', { ...ALL, zeroWidth: false })).toBe('a\u200bb');
  });

  it('reports nothing changed when the text was already clean', () => {
    const result = cleanInvisibleTool.run(listOf('anna@example.com'), ALL);
    expect(result.summary).toBe('Nothing changed.');
    expect(result.warnings?.[0]).toBe('No invisible characters found.');
  });

  it('counts the cells it cleaned and the characters it removed', () => {
    const result = cleanInvisibleTool.run(listOf('a\u200bb', 'plain'), ALL);
    expect(result.summary).toBe('Cleaned 1 cell');
    expect(result.stats).toEqual({ changed: 1, removed: 1 });
    expect(result.warnings?.[0]).toBe('1 invisible characters were removed.');
  });

  it('says nothing about removals when it only swapped spaces', () => {
    const result = cleanInvisibleTool.run(listOf('a\u00a0b'), ALL);
    expect(result.warnings).toBeUndefined();
  });

  it('never mutates its input', () => {
    const dataset = listOf('a\u200bb');
    const before = JSON.stringify(dataset);
    cleanInvisibleTool.run(dataset, ALL);
    expect(JSON.stringify(dataset)).toBe(before);
  });
});
