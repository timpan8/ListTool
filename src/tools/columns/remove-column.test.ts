import { describe, expect, it } from 'vitest';
import { removeColumnTool } from './remove-column';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

const table = () => tableOf(['a', 'b'], [{ a: 'x', b: 'y' }]);

describe('remove column', () => {
  it('drops the column', () => {
    const output = removeColumnTool.run(table(), { column: 'a' }).output;
    expect(output.columns.map((column) => column.id)).toEqual(['b']);
  });

  it('drops its values too, rather than leaving them orphaned', () => {
    const output = removeColumnTool.run(table(), { column: 'a' }).output;
    expect('a' in (output.rows[0]?.cells ?? {})).toBe(false);
    expect(cell(output.rows[0]!, 'b')).toBe('y');
  });

  it('refuses to leave a list with no columns', () => {
    const result = removeColumnTool.run(listOf('x'), { column: 'value' });
    expect(result.warnings?.[0]).toBe('A list needs at least one column.');
    expect(result.output.columns).toHaveLength(1);
  });

  it('is hidden on a one-column list', () => {
    expect(removeColumnTool.appliesTo?.(listOf('a'))).toBe(false);
  });

  describe('check', () => {
    it('counts the columns with nothing in them and opens on the first', () => {
      const gappy = tableOf(['a', 'b', 'c'], [{ a: 'x', b: '', c: ' ' }, { a: 'y', b: '', c: '' }]);
      expect(removeColumnTool.check?.(gappy)).toEqual({
        summary: '2 columns are empty',
        count: 2,
        options: { column: 'b' },
      });
    });

    it('says nothing when every column holds something', () => {
      expect(removeColumnTool.check?.(table())).toBeNull();
    });

    it('says nothing when there are no rows, or no column to keep', () => {
      expect(removeColumnTool.check?.(tableOf(['a', 'b'], []))).toBeNull();
      expect(removeColumnTool.check?.(tableOf(['a', 'b'], [{ a: '', b: '' }]))).toBeNull();
      expect(removeColumnTool.check?.(tableOf(['a'], [{ a: '' }]))).toBeNull();
    });
  });
});
