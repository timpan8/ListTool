import type { Column } from '../core/model';
import type { ViewSort } from '../core/view';
import { ui } from '../i18n';
import { format } from '../i18n/format';
import { ColumnMenu, type MenuItem } from './ColumnMenu';
import type { Marks } from './marks';
import { Mark } from './TableRow';

interface Props {
  column: Column;
  selected: boolean;
  numeric: boolean;
  marks?: Marks | undefined;
  sort?: ViewSort | null | undefined;
  onSort?: ((columnId: string) => void) | undefined;
  columnMenu?: ((column: Column) => MenuItem[]) | undefined;
}

/** A column heading: its name, a sort button when the view can be sorted, and the ▾. */
export function HeaderCell({ column, selected, numeric, marks, sort, onSort, columnMenu }: Props) {
  const isNew = marks?.columns.has(column.id) === true;
  const sortedHere = sort !== null && sort !== undefined && sort.columnId === column.id;
  const classes = [isNew ? 'is-new' : '', numeric ? 'is-numeric' : '', selected ? 'is-selected' : '']
    .filter((name) => name !== '')
    .join(' ');

  return (
    <th
      class={classes === '' ? undefined : classes}
      aria-sort={sortedHere ? (sort.direction === 'desc' ? 'descending' : 'ascending') : undefined}
    >
      <div class="table__header">
        {onSort === undefined ? (
          <span class="table__name">
            {isNew ? <Mark label={marks?.labels.column ?? ''} /> : null}
            {column.name}
          </span>
        ) : (
          <button
            type="button"
            class="table__head"
            title={ui.table.sortHint}
            onClick={() => onSort(column.id)}
          >
            {column.name}
            {sortedHere ? (
              <span class="table__sort" aria-hidden="true">
                {sort.direction === 'desc' ? '▼' : '▲'}
              </span>
            ) : null}
          </button>
        )}
        {columnMenu === undefined ? null : (
          <ColumnMenu
            label={format(ui.table.menu, { column: column.name })}
            items={columnMenu(column)}
          />
        )}
      </div>
    </th>
  );
}
