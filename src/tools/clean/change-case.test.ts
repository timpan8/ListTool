import { describe, expect, it } from 'vitest';
import { applyCase, changeCaseTool } from './change-case';
import { cell, VALUE_COLUMN } from '../../core/model';
import { listOf } from '../../test/fixtures';

function values(input: string[], mode: string): string[] {
  return changeCaseTool
    .run(listOf(...input), { mode })
    .output.rows.map((row) => cell(row, VALUE_COLUMN));
}

describe('change case', () => {
  it('uppercases', () => {
    expect(values(['anna andersson'], 'upper')).toEqual(['ANNA ANDERSSON']);
  });

  it('lowercases', () => {
    expect(values(['ANNA'], 'lower')).toEqual(['anna']);
  });

  it('title-cases every word', () => {
    expect(values(['anna maria andersson'], 'title')).toEqual(['Anna Maria Andersson']);
  });

  it('sentence-cases only the first letter of each sentence', () => {
    expect(values(['hello there. and again'], 'sentence')).toEqual(['Hello there. And again']);
  });

  it('handles Swedish characters in every mode', () => {
    expect(applyCase('åsa öberg', 'upper')).toBe('ÅSA ÖBERG');
    expect(applyCase('ÅSA ÖBERG', 'lower')).toBe('åsa öberg');
    expect(applyCase('åsa öberg', 'title')).toBe('Åsa Öberg');
  });

  it('keeps a hyphenated name as one word', () => {
    expect(applyCase('anna-maria', 'title')).toBe('Anna-Maria');
  });

  it('capitalises after the apostrophe in a name', () => {
    expect(applyCase("o'brien", 'title')).toBe("O'Brien");
    expect(applyCase("d'angelo", 'title')).toBe("D'Angelo");
  });

  it('leaves a contraction alone', () => {
    expect(applyCase("don't stop", 'title')).toBe("Don't Stop");
  });

  it('lowercases the rest of a shouted word when title-casing', () => {
    expect(applyCase('ANNA', 'title')).toBe('Anna');
  });

  it('reports what it changed', () => {
    expect(changeCaseTool.run(listOf('a', 'B'), { mode: 'lower' }).summary).toBe(
      'Changed the case of 1 cell',
    );
  });

  it('leaves the value alone for an unknown mode', () => {
    expect(applyCase('Anna', 'sideways')).toBe('Anna');
  });

  it('handles an empty value', () => {
    expect(values([''], 'title')).toEqual(['']);
  });
});
