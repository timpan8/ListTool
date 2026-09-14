import { describe, expect, it } from 'vitest';
import { parseColumnTool } from './parse-column';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const STUCK = tableOf(
  ['id', 'who'],
  [
    { id: '1', who: 'Andersson Anna <anna@example.com>' },
    { id: '2', who: 'Berg Bo <bo@example.com>' },
  ],
);

const BASE = { column: 'who', parserId: 'recipients', prefix: '', keepOriginal: true };

describe('parse column tool', () => {
  it('pulls Name <email> out of one column into columns', () => {
    const output = parseColumnTool.run(STUCK, BASE).output;

    expect(output.columns.map((column) => column.name)).toEqual([
      'id',
      'who',
      'First',
      'Last',
      'Email',
      'Original',
    ]);
    expect(cell(output.rows[0]!, 'first')).toBe('Anna');
    expect(cell(output.rows[0]!, 'email')).toBe('anna@example.com');
  });

  it('keeps the columns that were already there', () => {
    const output = parseColumnTool.run(STUCK, BASE).output;
    expect(cell(output.rows[1]!, 'id')).toBe('2');
  });

  it('can drop the column it read', () => {
    const output = parseColumnTool.run(STUCK, { ...BASE, keepOriginal: false }).output;
    expect(output.columns.some((column) => column.id === 'who')).toBe(false);
    expect(cell(output.rows[0]!, 'email')).toBe('anna@example.com');
  });

  it('widens a row, it never turns one row into several', () => {
    const many = tableOf(['who'], [{ who: 'a@example.com; b@example.com' }]);
    const output = parseColumnTool.run(many, { ...BASE, column: 'who' }).output;
    expect(output.rows).toHaveLength(1);
  });

  it('reads a column with any of the parsers, not only recipients', () => {
    const messy = tableOf(
      ['id', 'note'],
      [{ id: '1', note: 'hör av dig till anna@example.com om det krånglar' }],
    );
    const output = parseColumnTool.run(messy, {
      ...BASE,
      column: 'note',
      parserId: 'emails-in-text',
    }).output;

    expect(output.columns).toHaveLength(3);
    expect(cell(output.rows[0]!, 'value')).toBe('anna@example.com');
  });

  it('finds free ids when a produced name is already taken', () => {
    const clash = tableOf(['email', 'who'], [{ email: 'x', who: 'Bo <bo@example.com>' }]);
    const output = parseColumnTool.run(clash, { ...BASE, column: 'who' }).output;

    expect(output.columns.map((column) => column.id)).toContain('email2');
    expect(cell(output.rows[0]!, 'email')).toBe('x');
    expect(cell(output.rows[0]!, 'email2')).toBe('bo@example.com');
  });

  it('can prefix the new column names so their origin is visible', () => {
    const output = parseColumnTool.run(STUCK, { ...BASE, prefix: 'R: ' }).output;
    expect(output.columns[2]?.name).toBe('R: First');
  });

  it('leaves the new cells empty for a value it could not read, and says how many', () => {
    const gappy = tableOf(['who'], [{ who: 'Bo <bo@example.com>' }, { who: '' }]);
    const result = parseColumnTool.run(gappy, { ...BASE, column: 'who' });

    expect(cell(result.output.rows[1]!, 'email')).toBe('');
    expect(result.stats?.['unreadable']).toBe(0);
  });

  it('keeps the row ids, because it only widens the rows', () => {
    const output = parseColumnTool.run(STUCK, BASE).output;
    expect(output.rows.map((row) => row.id)).toEqual(['r1', 'r2']);
  });

  it('says so when the parser found nothing at all', () => {
    const empty = tableOf(['who'], [{ who: '' }]);
    const result = parseColumnTool.run(empty, { ...BASE, column: 'who' });
    expect(result.summary).toBe('Nothing changed.');
    expect(result.warnings?.[0]).toBe('That parser found nothing in that column.');
  });

  it('says what it read', () => {
    expect(parseColumnTool.run(STUCK, BASE).summary).toBe('Read who into 4 columns');
  });

  it('handles an empty list', () => {
    const result = parseColumnTool.run(listOf(), { ...BASE, column: '' });
    expect(result.summary).toBe('Nothing changed.');
  });

  it('never mutates its input', () => {
    const before = JSON.stringify(STUCK);
    parseColumnTool.run(STUCK, BASE);
    expect(JSON.stringify(STUCK)).toBe(before);
  });
});
