import { describe, expect, it } from 'vitest';
import { jsonExporter } from './json';
import { listOf, tableOf } from '../test/fixtures';

describe('json exporter', () => {
  it('writes an array of values', () => {
    expect(JSON.parse(jsonExporter.render(listOf('a', 'b'), {}))).toEqual(['a', 'b']);
  });

  it('writes an array of objects when asked', () => {
    const table = tableOf(['first', 'email'], [{ first: 'Anna', email: 'a@example.com' }]);
    expect(JSON.parse(jsonExporter.render(table, { asObjects: true }))).toEqual([
      { first: 'Anna', email: 'a@example.com' },
    ]);
  });

  it('keys objects by column name, not id', () => {
    const table = { ...tableOf(['c1'], [{ c1: 'x' }]) };
    table.columns = [{ id: 'c1', name: 'Email' }];
    expect(jsonExporter.render(table, { asObjects: true })).toContain('"Email"');
  });

  it('escapes quotes and newlines properly', () => {
    const text = jsonExporter.render(listOf('say "hi"\nthere'), {});
    expect(JSON.parse(text)).toEqual(['say "hi"\nthere']);
  });

  it('writes an empty array for an empty list', () => {
    expect(JSON.parse(jsonExporter.render(listOf(), {}))).toEqual([]);
  });

  it('offers a file extension', () => {
    expect(jsonExporter.extension).toBe('json');
  });
});
