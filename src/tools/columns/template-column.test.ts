import { describe, expect, it } from 'vitest';
import { templateColumnTool } from './template-column';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const PEOPLE = tableOf(
  ['first', 'last'],
  [
    { first: 'Anna', last: 'Berg' },
    { first: 'Bo', last: 'Ek' },
  ],
);

const BASE = { columnName: 'Built', unknown: true };

function built(template: string, options: Record<string, unknown> = {}) {
  return templateColumnTool.run(PEOPLE, { ...BASE, template, ...options });
}

describe('template column tool', () => {
  it('writes the filled template into a new column', () => {
    const output = built('{first}.{last}@example.com').output;
    expect(output.rows.map((row) => cell(row, 'built'))).toEqual([
      'Anna.Berg@example.com',
      'Bo.Ek@example.com',
    ]);
  });

  it('names the column what you called it', () => {
    const output = built('{first}', { columnName: 'Alias' }).output;
    expect(output.columns.map((column) => column.name)).toEqual(['first', 'last', 'Alias']);
  });

  it('keeps the columns that were there', () => {
    const output = built('{first}').output;
    expect(cell(output.rows[0]!, 'first')).toBe('Anna');
    expect(cell(output.rows[0]!, 'last')).toBe('Berg');
  });

  it('keeps the row ids, because it only adds a column', () => {
    expect(built('{first}').output.rows.map((row) => row.id)).toEqual(['r1', 'r2']);
  });

  it('does what Build display name does, without being a second tool for it', () => {
    expect(built('{last}, {first}').output.rows.map((row) => cell(row, 'built'))).toEqual([
      'Berg, Anna',
      'Ek, Bo',
    ]);
  });

  it('warns about a placeholder nothing is called, and leaves it written', () => {
    const result = built('{first} {nope}');
    expect(cell(result.output.rows[0]!, 'built')).toBe('Anna {nope}');
    expect(result.warnings?.[0]).toBe(
      'Nothing is called nope in this list, so it was left as written.',
    );
  });

  it('can be told to drop an unknown placeholder instead', () => {
    expect(cell(built('[{nope}]', { unknown: false }).output.rows[0]!, 'built')).toBe('[]');
  });

  it('asks for a template rather than filling a column with nothing', () => {
    const result = built('   ');
    expect(result.summary).toBe('Nothing changed.');
    expect(result.warnings?.[0]).toBe('Type a template first.');
    expect(result.output.columns).toHaveLength(2);
  });

  it('finds a free id when the obvious one is taken', () => {
    const taken = tableOf(['built'], [{ built: 'x' }]);
    const output = templateColumnTool.run(taken, { ...BASE, template: '{built}!' }).output;
    expect(output.columns.map((column) => column.id)).toEqual(['built', 'built2']);
    expect(cell(output.rows[0]!, 'built2')).toBe('x!');
  });

  it('falls back to a name when the field was cleared', () => {
    expect(built('{first}', { columnName: '  ' }).output.columns[2]?.name).toBe('Built');
  });

  it('says what it built', () => {
    expect(built('{first}').summary).toBe('Built Built for 2 rows');
  });

  it('handles an empty list', () => {
    const result = templateColumnTool.run(listOf(), { ...BASE, template: '{value}' });
    expect(result.output.rows).toEqual([]);
  });

  it('never mutates its input', () => {
    const before = JSON.stringify(PEOPLE);
    built('{first}');
    expect(JSON.stringify(PEOPLE)).toBe(before);
  });
});
