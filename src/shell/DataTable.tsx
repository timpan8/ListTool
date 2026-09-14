import { cellKey, type DatasetDiff } from '../core/diff';
import { cell, type Column, type Row } from '../core/model';
import { en } from '../i18n/en';
import { format } from '../i18n/format';
import { TableCell } from './TableCell';

interface Props {
  columns: Column[];
  rows: Row[];
  /** Column the status bar counts on; clicking a header toggles it. */
  selected?: string | null;
  onSelect?: (columnId: string | null) => void;
  showRowNumbers?: boolean;
  /** Row ids ticked in the table. Given only when the view offers ticking. */
  ticked?: string[];
  onTick?: (rowId: string) => void;
  onTickAll?: (checked: boolean) => void;
  /** Given only where editing is meant: the dataset view, never a preview. */
  onEdit?: (rowId: string, columnId: string, value: string) => void;
  /** Marks what a tool changed. Shown as a mark and a word, never as colour alone. */
  diff?: DatasetDiff;
}

/** The mark a changed cell, new row or new column carries. */
function Mark({ label }: { label: string }) {
  return (
    <>
      <span class="mark" aria-hidden="true">
        ●
      </span>
      <span class="visually-hidden">{label}</span>
    </>
  );
}

export function DataTable({
  columns,
  rows,
  selected,
  onSelect,
  showRowNumbers,
  ticked,
  onTick,
  onTickAll,
  onEdit,
  diff,
}: Props) {
  const chosen = new Set(ticked ?? []);
  const tickable = ticked !== undefined && onTick !== undefined;
  const allTicked = rows.length > 0 && rows.every((row) => chosen.has(row.id));

  return (
    <div class="table-wrap">
      <table class="table">
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
            {columns.map((column) => {
              const isSelected = selected === column.id;
              const isNew = diff?.addedColumns.has(column.id) === true;
              return (
                <th key={column.id} class={isNew ? 'is-new' : undefined}>
                  {isNew ? <Mark label={en.panel.addedColumn} /> : null}
                  {onSelect === undefined ? (
                    column.name
                  ) : (
                    <button
                      type="button"
                      class={isSelected ? 'table__head is-selected' : 'table__head'}
                      aria-pressed={isSelected}
                      onClick={() => onSelect(isSelected ? null : column.id)}
                    >
                      {column.name}
                    </button>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id}
              class={
                [
                  chosen.has(row.id) ? 'is-ticked' : '',
                  diff?.addedRows.has(row.id) === true ? 'is-new' : '',
                ]
                  .filter((name) => name !== '')
                  .join(' ') || undefined
              }
            >
              {tickable ? (
                <td class="table__tick">
                  <input
                    type="checkbox"
                    aria-label={format(en.view.selectRow, { n: index + 1 })}
                    checked={chosen.has(row.id)}
                    onChange={() => onTick?.(row.id)}
                  />
                </td>
              ) : null}
              {showRowNumbers === true ? <td class="table__number">{index + 1}</td> : null}
              {columns.map((column) =>
                onEdit === undefined ? (
                  <td
                    key={column.id}
                    class={
                      [
                        selected === column.id ? 'is-selected' : '',
                        diff?.changedCells.has(cellKey(row.id, column.id)) === true
                          ? 'is-changed'
                          : '',
                      ]
                        .filter((name) => name !== '')
                        .join(' ') || undefined
                    }
                  >
                    {diff?.changedCells.has(cellKey(row.id, column.id)) === true ? (
                      <Mark label={en.panel.changedCell} />
                    ) : null}
                    {cell(row, column.id)}
                  </td>
                ) : (
                  <TableCell
                    key={column.id}
                    value={cell(row, column.id)}
                    label={format(en.view.editCell, { column: column.name, n: index + 1 })}
                    selected={selected === column.id}
                    onCommit={(value) => onEdit(row.id, column.id, value)}
                  />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
