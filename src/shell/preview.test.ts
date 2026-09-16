import { describe, expect, it } from 'vitest';
import { previewRows, PREVIEW_MAX, PREVIEW_ROWS } from './preview';
import { diffDatasets } from '../core/diff';
import { makeRow, VALUE_COLUMN } from '../core/model';
import { listOf } from '../test/fixtures';
import { trimTool } from '../tools/clean/trim';
import { validateEmailsTool } from '../tools/clean/validate-emails';
import { removeBlankRowsTool } from '../tools/clean/remove-blank-rows';
import { withRows } from '../tools/helpers';

const padded = (n: number): string[] =>
  Array.from({ length: n }, (_, index) => (index % 3 === 0 ? ` v${index} ` : `v${index}`));

describe('previewRows', () => {
  it('shows the changed rows first and says how many there are', () => {
    const before = listOf(...padded(30));
    const after = trimTool.run(before, {}).output;
    const preview = previewRows(after, diffDatasets(before, after), false);
    expect(preview.rows).toHaveLength(PREVIEW_ROWS);
    expect(preview.rows.every((row) => Number(row.id.slice(1)) % 3 === 1)).toBe(true);
    expect(preview.caption).toBe('First 8 of 10 changed rows');
    expect(preview.expandable).toBe(true);
  });

  it('shows every changed row when expanded, up to the larger cap', () => {
    const before = listOf(...padded(30));
    const after = trimTool.run(before, {}).output;
    const preview = previewRows(after, diffDatasets(before, after), true);
    expect(preview.rows).toHaveLength(30);
    expect(preview.caption).toBe('First 30 rows · the 10 changed ones first');

    const huge = listOf(...padded(900));
    const trimmed = trimTool.run(huge, {}).output;
    expect(previewRows(trimmed, diffDatasets(huge, trimmed), true).rows).toHaveLength(PREVIEW_MAX);
  });

  it('says when the changed rows all fit', () => {
    const before = listOf(' a ', 'b', 'c');
    const after = trimTool.run(before, {}).output;
    const preview = previewRows(after, diffDatasets(before, after), false);
    expect(preview.caption).toBe('First 3 rows · the 1 changed ones first');
    expect(preview.expandable).toBe(false);
  });

  it('counts a new column rather than every cell in it', () => {
    const before = listOf('anna@example.com', 'nope');
    const after = validateEmailsTool.run(before, {}).output;
    const preview = previewRows(after, diffDatasets(before, after), false);
    expect(preview.caption).toBe('First 2 rows · 1 new column');
  });

  it('says how many rows would go when rows go', () => {
    const before = listOf('a', '', 'b', '');
    const after = removeBlankRowsTool.run(before, {}).output;
    const preview = previewRows(after, diffDatasets(before, after), false);
    expect(preview.caption).toBe('First 2 of the 2 rows that remain · 2 removed');
  });

  it('says so when nothing changes', () => {
    const before = listOf('a', 'b');
    const preview = previewRows(before, diffDatasets(before, before), false);
    expect(preview.caption).toBe('First 2 rows — nothing changes');
    expect(preview.rows).toBe(before.rows);
  });

  it('puts a new row first too', () => {
    const before = listOf('a', 'b');
    const after = withRows(before, [...before.rows, makeRow(5, { [VALUE_COLUMN]: 'c' })]);
    const preview = previewRows(after, diffDatasets(before, after), false);
    expect(preview.rows[0]?.id).toBe('r6');
  });
});
