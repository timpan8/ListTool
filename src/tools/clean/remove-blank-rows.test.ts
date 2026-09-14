import { describe, expect, it } from 'vitest';
import { removeBlankRowsTool } from './remove-blank-rows';
import { listOf, tableOf } from '../../test/fixtures';

describe('remove blank rows', () => {
  it('drops empty and whitespace-only rows', () => {
    expect(removeBlankRowsTool.run(listOf('a', '', '   ', 'b'), {}).output.rows).toHaveLength(2);
  });

  it('reports the before and after counts', () => {
    expect(removeBlankRowsTool.run(listOf('a', '', 'b'), {}).summary).toBe(
      'Removed 1 blank row (3 rows → 2 rows)',
    );
  });

  it('says so when there is nothing to remove', () => {
    expect(removeBlankRowsTool.run(listOf('a'), {}).summary).toBe('Nothing changed.');
  });

  it('keeps a row where only some cells are empty', () => {
    const table = tableOf(['a', 'b'], [{ a: '', b: 'x' }, { a: '', b: '' }]);
    expect(removeBlankRowsTool.run(table, {}).output.rows).toHaveLength(1);
  });

  it('drops rows blank in the chosen column, whatever else they hold', () => {
    const table = tableOf(['a', 'b'], [{ a: '', b: 'x' }, { a: 'y', b: '' }]);
    const output = removeBlankRowsTool.run(table, { column: 'a' }).output;
    expect(output.rows).toHaveLength(1);
    expect(output.rows[0]?.cells['a']).toBe('y');
  });

  it('handles an empty list', () => {
    expect(removeBlankRowsTool.run(listOf(), {}).output.rows).toEqual([]);
  });
});
