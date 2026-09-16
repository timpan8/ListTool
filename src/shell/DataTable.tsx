import { useState } from 'preact/hooks';
import type { Column, Row } from '../core/model';
import type { ViewSort } from '../core/view';
import { en } from '../i18n/en';
import { format } from '../i18n/format';
import type { MenuItem } from './ColumnMenu';
import { nextCell } from './gridKeys';
import { HeaderCell } from './HeaderCell';
import type { Marks } from './marks';
import { TableRow } from './TableRow';

/** How many rows a table shows before it asks; a list is rarely read past this. */
export const ROW_CAP = 500;

interface Props {
  columns: Column[];
  rows: Row[];
  /** The column the status bar counts on, shown highlighted. */
  selected?: string | null;
  showRowNumbers?: boolean;
  /** Row ids ticked in the table. Given only when the view offers ticking. */
  ticked?: string[];
  onTick?: (rowId: string) => void;
  onTickAll?: (checked: boolean) => void;
  /** Given only where editing is meant: the dataset view, never a preview. */
  onEdit?: (rowId: string, columnId: string, value: string) => void;
  /** Cells, rows and columns to point at. Shown as a mark and a word, never as colour alone. */
  marks?: Marks;
  /** The view's order, and what a header click does about it. */
  sort?: ViewSort | null;
  onSort?: (columnId: string) => void;
  /** What the ▾ beside a column offers. Given only in the dataset view. */
  columnMenu?: (column: Column) => MenuItem[];
  /** Columns shown as numbers: right-aligned, like a spreadsheet. */
  numeric?: ReadonlySet<string>;
  rowClass?: (row: Row) => string | undefined;
  cap?: number;
}

export function DataTable({
  columns,
  rows,
  selected,
  showRowNumbers,
  ticked,
  onTick,
  onTickAll,
  onEdit,
  marks,
  sort,
  onSort,
  columnMenu,
  numeric,
  rowClass,
  cap = ROW_CAP,
}: Props) {
  const [limit, setLimit] = useState(cap);
  const chosen = new Set(ticked ?? []);
  const tickable = ticked !== undefined && onTick !== undefined;
  const allTicked = rows.length > 0 && rows.every((row) => chosen.has(row.id));
  const shown = rows.length > limit ? rows.slice(0, limit) : rows;

  function onKeyDown(event: KeyboardEvent): void {
    // Arrows inside a text box move the caret; anywhere else they move between cells.
    if (!(event.target instanceof HTMLElement)) return;
    if (event.target instanceof HTMLInputElement && event.target.type === 'text') return;
    const target = nextCell(event.target, event.key);
    if (target === null) return;
    event.preventDefault();
    target.focus();
  }

  return (
    <div class="table-wrap">
      <table class="table" onKeyDown={onKeyDown}>
        <thead>
          <tr>
            {tickable ? (
              <th class="table__tick">
                <input
                  type="checkbox"
                  aria-label={en.view.selectAll}
                  checked={allTicked}
                  onChange={(event) => onTickAll?.(event.currentTarget.checked)}
                />
              </th>
            ) : null}
            {showRowNumbers === true ? <th class="table__number">{en.view.rowNumber}</th> : null}
            {columns.map((column) => (
              <HeaderCell
                key={column.id}
                column={column}
                selected={selected === column.id}
                numeric={numeric?.has(column.id) === true}
                marks={marks}
                sort={sort}
                onSort={onSort}
                columnMenu={columnMenu}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row, index) => (
            <TableRow
              key={row.id}
              row={row}
              index={index}
              columns={columns}
              tickable={tickable}
              ticked={chosen.has(row.id)}
              onTick={onTick}
              showNumber={showRowNumbers === true}
              selected={selected}
              numeric={numeric}
              marks={marks}
              extraClass={rowClass?.(row)}
              onEdit={onEdit}
            />
          ))}
        </tbody>
      </table>
      {rows.length > limit ? (
        <p class="table__more">
          <span>{format(en.table.capped, { shown: shown.length, total: rows.length })}</span>
          <button type="button" class="button button--quiet" onClick={() => setLimit(limit + cap)}>
            {format(en.table.showMore, { n: Math.min(cap, rows.length - limit) })}
          </button>
          <button type="button" class="button button--quiet" onClick={() => setLimit(rows.length)}>
            {format(en.table.showAll, { n: rows.length })}
          </button>
        </p>
      ) : null}
    </div>
  );
}
