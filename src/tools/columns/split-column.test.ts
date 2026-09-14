import { describe, expect, it } from 'vitest';
import { splitColumnTool } from './split-column';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

describe('split column', () => {
  it('splits into as many columns as the widest row needs', () => {
    const output = splitColumnTool.run(listOf('a b c', 'd e'), { delimiter: ' ' }).output;
    expect(output.columns).toHaveLength(3);
    expect(output.rows.map((row) => cell(row, 'value'))).toEqual(['a', 'd']);
  });

  it('pads shorter rows with empty cells', () => {
    const output = splitColumnTool.run(listOf('a b c', 'd'), { delimiter: ' ' }).output;
    expect(cell(output.rows[1]!, 'value_3')).toBe('');
  });

  it('keeps the source column id and gives it the first part', () => {
    const output = splitColumnTool.run(listOf('a b'), { delimiter: ' ' }).output;
    expect(output.columns[0]?.id).toBe('value');
    expect(cell(output.rows[0]!, 'value')).toBe('a');
  });

  it('names the new columns after the source', () => {
    const output = splitColumnTool.run(listOf('a b'), { delimiter: ' ' }).output;
    expect(output.columns.map((column) => column.name)).toEqual(['Value', 'Value 2']);
  });

  it('inserts the new columns right after the source', () => {
    const table = tableOf(['name', 'tail'], [{ name: 'a b', tail: 'z' }]);
    const output = splitColumnTool.run(table, { column: 'name', delimiter: ' ' }).output;
    expect(output.columns.map((column) => column.id)).toEqual(['name', 'name_2', 'tail']);
  });

  it('warns when nothing contains the delimiter', () => {
    const result = splitColumnTool.run(listOf('a', 'b'), { delimiter: ';' });
    expect(result.warnings?.[0]).toContain('Nothing to split');
    expect(result.output.columns).toHaveLength(1);
  });

  it('does nothing with an empty delimiter', () => {
    expect(splitColumnTool.run(listOf('ab'), { delimiter: '' }).summary).toBe('Nothing changed.');
  });

  it('splits on a tab', () => {
    const output = splitColumnTool.run(listOf('a\tb'), { delimiter: '\t' }).output;
    expect(cell(output.rows[0]!, 'value_2')).toBe('b');
  });

  it('reports the result', () => {
    expect(splitColumnTool.run(listOf('a b'), { delimiter: ' ' }).summary).toBe(
      'Split Value into 2 columns',
    );
  });

  it('never collides with a column id that already exists', () => {
    const table = tableOf(['name', 'name_2'], [{ name: 'a b', name_2: 'keep' }]);
    const output = splitColumnTool.run(table, { column: 'name', delimiter: ' ' }).output;
    expect(output.columns.map((column) => column.id)).toEqual(['name', 'name_22', 'name_2']);
    expect(cell(output.rows[0]!, 'name_2')).toBe('keep');
  });
});
