import { describe, expect, it } from 'vitest';
import { TOOL_CATEGORIES, toolById, tools } from './index';
import { defaultOptions } from '../core/registry';
import { listOf, tableOf } from '../test/fixtures';

const list = listOf('  Anna  ', 'anna', '', 'Bo');
const table = tableOf(
  ['first', 'last'],
  [
    { first: 'Anna', last: 'Andersson' },
    { first: 'Bo', last: 'Berg' },
  ],
);

describe('tool registry', () => {
  it('has unique ids', () => {
    const ids = tools.map((tool) => tool.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses kebab-case ids, which recipes will reference forever', () => {
    for (const tool of tools) expect(tool.id).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  it('looks tools up by id', () => {
    expect(toolById('remove-duplicates')?.name).toBe('Remove duplicates');
    expect(toolById('nope')).toBeUndefined();
  });

  it('gives every tool a name, a description, keywords and a known category', () => {
    for (const tool of tools) {
      expect(tool.name.trim()).not.toBe('');
      expect(tool.description.trim()).not.toBe('');
      expect(tool.keywords.length).toBeGreaterThan(0);
      expect(TOOL_CATEGORIES).toContain(tool.category);
    }
  });

  it('labels every option', () => {
    for (const tool of tools) {
      for (const field of tool.options) expect(field.label.trim()).not.toBe('');
    }
  });

  it('runs from its own defaults and returns a summary, for every tool', () => {
    for (const tool of tools) {
      const result = tool.run(table, defaultOptions(tool.options));
      expect(result.summary.trim()).not.toBe('');
      expect(result.output.rows).toBeDefined();
    }
  });

  it('survives an empty list, for every tool', () => {
    for (const tool of tools) {
      expect(() => tool.run(listOf(), defaultOptions(tool.options))).not.toThrow();
    }
  });

  it('never mutates its input, for every tool', () => {
    for (const tool of tools) {
      const before = JSON.stringify(list);
      tool.run(list, defaultOptions(tool.options));
      expect(JSON.stringify(list)).toBe(before);
    }
  });

  it('is deterministic, for every tool', () => {
    for (const tool of tools) {
      const options = defaultOptions(tool.options);
      expect(tool.run(table, options).output).toEqual(tool.run(table, options).output);
    }
  });

  it('keeps every row id unique, for every tool', () => {
    for (const tool of tools) {
      const rows = tool.run(table, defaultOptions(tool.options)).output.rows;
      expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
    }
  });

  it("only asks about a second list's columns from a tool that has one", () => {
    for (const tool of tools) {
      const asksSecond = tool.options.some(
        (field) =>
          (field.type === 'column' || field.type === 'columns') && field.from === 'second',
      );
      if (asksSecond) expect(tool.arity).toBe('dual');
    }
  });

  it('gives every extra list a name and a dataset, for every tool that makes one', () => {
    for (const tool of tools) {
      const extras = tool.run(table, defaultOptions(tool.options)).extraLists ?? [];
      for (const extra of extras) {
        expect(extra.name.trim()).not.toBe('');
        expect(extra.dataset.columns.length).toBeGreaterThan(0);
        expect(new Set(extra.dataset.rows.map((row) => row.id)).size).toBe(
          extra.dataset.rows.length,
        );
      }
    }
  });

  it('hides every tool that needs two columns from a one-column list', () => {
    const hidden = tools.filter((tool) => tool.appliesTo?.(listOf('a')) === false);
    expect(hidden.map((tool) => tool.id).sort()).toEqual([
      'build-display-name',
      'cross-tab',
      'generate-email',
      'keep-columns',
      'merge-columns',
      'move-column',
      'remove-column',
      'swap-columns',
      'unpivot',
    ]);
  });

  it('offers all of them again on a table', () => {
    const hidden = tools.filter((tool) => tool.appliesTo?.(table) === false);
    expect(hidden).toEqual([]);
  });
});
