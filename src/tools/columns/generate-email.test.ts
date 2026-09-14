import { describe, expect, it } from 'vitest';
import { generateEmailTool } from './generate-email';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const table = () =>
  tableOf(
    ['first', 'last'],
    [
      { first: 'Anna', last: 'Andersson' },
      { first: 'Åsa', last: 'Öberg' },
      { first: 'Ann Marie', last: 'Berg' },
    ],
  );

function generated(options: Record<string, unknown>): string[] {
  return generateEmailTool.run(table(), options).output.rows.map((row) =>
    cell(row, 'generated'),
  );
}

describe('generate email', () => {
  it('builds first.last@domain by default', () => {
    expect(generated({})[0]).toBe('anna.andersson@example.com');
  });

  it('folds Swedish characters into the address', () => {
    expect(generated({})[1]).toBe('asa.oberg@example.com');
  });

  it('keeps them when folding is off', () => {
    expect(generated({ stripDiacritics: false })[1]).toBe('åsa.öberg@example.com');
  });

  it('turns a space in a name into a hyphen', () => {
    expect(generated({})[2]).toBe('ann-marie.berg@example.com');
  });

  it('honours another pattern', () => {
    expect(generated({ pattern: '{first}{last}' })[0]).toBe('annaandersson@example.com');
  });

  it('honours another domain, with or without the at sign', () => {
    expect(generated({ domain: 'lists.example.org' })[0]).toContain('@lists.example.org');
    expect(generated({ domain: '@example.net' })[0]).toContain('@example.net');
  });

  it('keeps the case when lowercasing is off', () => {
    expect(generated({ lowercase: false })[0]).toBe('Anna.Andersson@example.com');
  });

  it('reports how many it generated', () => {
    expect(generateEmailTool.run(table(), {}).summary).toBe('Generated 3 addresses');
  });

  it('is hidden on a one-column list', () => {
    expect(generateEmailTool.appliesTo?.(listOf('a'))).toBe(false);
  });
});
