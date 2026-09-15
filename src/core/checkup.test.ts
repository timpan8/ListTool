import { describe, expect, it } from 'vitest';
import { checkup } from './checkup';
import type { Tool } from './registry';
import { tools } from '../tools';
import { listOf, tableOf } from '../test/fixtures';

const MESSY = tableOf(
  ['name', 'email'],
  [
    { name: '  Anna  ', email: 'anna@example.com' },
    { name: 'Anna', email: 'not an address' },
    { name: 'Anna', email: 'anna@example.com' },
    { name: '', email: '' },
    { name: 'Bo  Berg', email: 'bo@example.com' },
  ],
);

function ids(dataset = MESSY): string[] {
  return checkup(dataset, tools).map((entry) => entry.tool.id);
}

describe('checkup', () => {
  it('finds what the cleaning tools would find', () => {
    expect(ids()).toContain('trim-whitespace');
    expect(ids()).toContain('remove-duplicates');
    expect(ids()).toContain('remove-blank-rows');
    expect(ids()).toContain('validate-emails');
    expect(ids()).toContain('collapse-whitespace');
  });

  it('says nothing about a list with nothing wrong with it', () => {
    const clean = tableOf(['name'], [{ name: 'Anna' }, { name: 'Bo' }]);
    expect(checkup(clean, tools)).toEqual([]);
  });

  it('reports the biggest finding first', () => {
    const counts = checkup(MESSY, tools).map((entry) => entry.finding.count);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  it('gives every finding a count and a line of text', () => {
    for (const entry of checkup(MESSY, tools)) {
      expect(entry.finding.count).toBeGreaterThan(0);
      expect(entry.finding.summary.trim()).not.toBe('');
    }
  });

  it('hands over options that open the tool on what it found', () => {
    const emails = checkup(MESSY, tools).find((entry) => entry.tool.id === 'validate-emails');
    expect(emails?.finding.options).toEqual({ column: 'email' });
  });

  it('only flags malformed addresses where a column actually holds addresses', () => {
    const names = tableOf(['name'], [{ name: 'Anna' }, { name: 'Bo' }]);
    expect(checkup(names, tools).some((entry) => entry.tool.id === 'validate-emails')).toBe(
      false,
    );
  });

  it('does not report one cell under two headings', () => {
    // Space around a value is Trim's; a double space inside it is Collapse's.
    const padded = tableOf(['a'], [{ a: '  Anna  ' }]);
    expect(ids(padded)).toEqual(['trim-whitespace']);
  });

  it('finds mis-decoded text and invisible characters', () => {
    const broken = tableOf(['a'], [{ a: 'Ã…sa' }, { a: 'x​y' }]);
    expect(ids(broken)).toContain('fix-mojibake');
    expect(ids(broken)).toContain('clean-invisible');
  });

  it('skips a tool that does not fit the list', () => {
    const fake: Tool = {
      id: 'never',
      name: 'Never',
      category: 'clean',
      description: '',
      keywords: [],
      arity: 'single',
      options: [],
      appliesTo: () => false,
      run: (input) => ({ output: input, summary: '' }),
      check: () => ({ summary: 'should not appear', count: 99 }),
    };
    expect(checkup(MESSY, [fake])).toEqual([]);
  });

  it('ignores a finding that found nothing', () => {
    const zero: Tool = {
      id: 'zero',
      name: 'Zero',
      category: 'clean',
      description: '',
      keywords: [],
      arity: 'single',
      options: [],
      run: (input) => ({ output: input, summary: '' }),
      check: () => ({ summary: 'nothing', count: 0 }),
    };
    expect(checkup(MESSY, [zero])).toEqual([]);
  });

  it('handles an empty list', () => {
    expect(checkup(listOf(), tools)).toEqual([]);
  });

  it('never changes the list it looks at', () => {
    const before = JSON.stringify(MESSY);
    checkup(MESSY, tools);
    expect(JSON.stringify(MESSY)).toBe(before);
  });

  it('gives the same answer every time', () => {
    expect(checkup(MESSY, tools)).toEqual(checkup(MESSY, tools));
  });
});
