import { describe, expect, it } from 'vitest';
import { filenameFor } from './download';

describe('filenameFor', () => {
  it('keeps a plain name', () => {
    expect(filenameFor('Recipients', 'csv')).toBe('Recipients.csv');
  });

  it('replaces spaces and punctuation with single dashes', () => {
    expect(filenameFor('Current users (2026)', 'tsv')).toBe('Current-users-2026.tsv');
  });

  it('keeps Swedish characters', () => {
    expect(filenameFor('Åsas lista', 'csv')).toBe('Åsas-lista.csv');
  });

  it('trims dashes from both ends', () => {
    expect(filenameFor('  ...list...  ', 'csv')).toBe('list.csv');
  });

  it('falls back when nothing usable is left', () => {
    expect(filenameFor('///', 'csv')).toBe('list.csv');
  });
});
