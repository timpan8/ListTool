import { describe, expect, it } from 'vitest';
import { groupCells } from './groups';

const COLUMNS = ['status', 'a_x', 'a_y', 'b_x', 'b_y'].map((id) => ({ id, name: id }));

describe('groupCells', () => {
  it('spans each group once where it starts, and leaves an empty cell over the rest', () => {
    expect(
      groupCells(COLUMNS, [
        { name: 'Kunder', columnIds: ['a_x', 'a_y'] },
        { name: 'Leads', columnIds: ['b_x', 'b_y'] },
      ]),
    ).toEqual([null, { name: 'Kunder', span: 2 }, { name: 'Leads', span: 2 }]);
  });

  it('counts only the group columns the table actually has', () => {
    expect(groupCells(COLUMNS.slice(0, 2), [{ name: 'Kunder', columnIds: ['a_x', 'a_y'] }])).toEqual([
      null,
      { name: 'Kunder', span: 1 },
    ]);
  });

  it('is all empty cells when there are no groups', () => {
    expect(groupCells(COLUMNS, [])).toEqual([null, null, null, null, null]);
  });
});
