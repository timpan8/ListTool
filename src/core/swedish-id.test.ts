import { describe, expect, it } from 'vitest';
import { looksLikeSwedishId, luhnValid, readSwedishId } from './swedish-id';

// Skatteverket's published test numbers, never real people.
const TODAY = { y: 2026, m: 9, d: 15 };

describe('luhnValid', () => {
  it('accepts a number whose check digit adds up, and nothing else', () => {
    expect(luhnValid('8112189876')).toBe(true);
    expect(luhnValid('8112189877')).toBe(false);
    expect(luhnValid('811218987')).toBe(false);
    expect(luhnValid('81121898a6')).toBe(false);
  });
});

describe('readSwedishId', () => {
  it('reads a personnummer in every written form, to one normalised form', () => {
    for (const written of ['811218-9876', '8112189876', '19811218-9876', '198112189876', '811218 9876']) {
      expect(readSwedishId(written, TODAY), written).toEqual({
        kind: 'personnummer',
        normalized: '19811218-9876',
      });
    }
  });

  it('puts a birth year in the right century', () => {
    expect(readSwedishId('201231-2381', TODAY)?.normalized).toBe('20201231-2381');
    expect(readSwedishId('261231-2385', TODAY)?.normalized).toBe('19261231-2385');
    // A plus sign means a hundred or more: one century further back.
    expect(readSwedishId('201231+2381', TODAY)?.normalized).toBe('19201231-2381');
  });

  it('reads a samordningsnummer, with the day pushed past sixty', () => {
    expect(readSwedishId('811278-9865', TODAY)).toEqual({
      kind: 'samordningsnummer',
      normalized: '19811278-9865',
    });
  });

  it('reads an organisationsnummer, with or without the 16 prefix', () => {
    expect(readSwedishId('556036-0793', TODAY)).toEqual({
      kind: 'organisationsnummer',
      normalized: '556036-0793',
    });
    expect(readSwedishId('165560360793', TODAY)?.normalized).toBe('556036-0793');
    expect(readSwedishId('195560360793', TODAY)).toBeNull();
  });

  it('refuses a wrong check digit, a date that does not exist and the wrong shape', () => {
    expect(readSwedishId('811218-9877', TODAY)).toBeNull();
    expect(readSwedishId('811318-9876', TODAY)).toBeNull();
    expect(readSwedishId('810230-9876', TODAY)).toBeNull();
    expect(readSwedishId('81121-9876', TODAY)).toBeNull();
    expect(readSwedishId('anna@example.com', TODAY)).toBeNull();
    expect(readSwedishId('', TODAY)).toBeNull();
  });
});

describe('looksLikeSwedishId', () => {
  it('is about the shape, not the check', () => {
    expect(looksLikeSwedishId('811218-9877')).toBe(true);
    expect(looksLikeSwedishId('19811218 9876')).toBe(true);
    expect(looksLikeSwedishId('070-123 45 67')).toBe(false);
  });
});
