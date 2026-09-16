import type { ColumnGroup } from '../core/compare';
import type { Column } from '../core/model';

export interface GroupCell {
  name: string;
  span: number;
}

/**
 * The cells of a group header row: one spanning cell where a group's columns begin, an
 * empty one over every column that belongs to no group. A group's columns are expected
 * to sit together, as the side-by-side comparison lays them out.
 */
export function groupCells(columns: Column[], groups: ColumnGroup[]): (GroupCell | null)[] {
  const groupOf = new Map<string, ColumnGroup>();
  for (const group of groups) {
    for (const id of group.columnIds) groupOf.set(id, group);
  }

  const cells: (GroupCell | null)[] = [];
  const started = new Set<ColumnGroup>();
  for (const column of columns) {
    const group = groupOf.get(column.id);
    if (group === undefined) {
      cells.push(null);
      continue;
    }
    if (started.has(group)) continue;
    started.add(group);
    cells.push({
      name: group.name,
      span: columns.filter((candidate) => group.columnIds.includes(candidate.id)).length,
    });
  }
  return cells;
}
