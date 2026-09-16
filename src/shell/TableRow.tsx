import { cellKey } from '../core/diff';
import { cell, type Column, type Row } from '../core/model';
import { ui } from '../i18n';
import { format } from '../i18n/format';
import type { Marks } from './marks';
import { TableCell } from './TableCell';

/** The mark a changed cell, new row or new column carries: a dot, and a word for readers. */
export function Mark({ label }: { label: string }) {
  return (
    <>
      <span class="mark" aria-hidden="true">
        ●
      </span>
      <span class="visually-hidden">{label}</span>
    </>
  );
}

interface Props {
  row: Row;
  /** Position in the table as shown, for the row number and the labels. */
  index: number;
  columns: Column[];
  tickable: boolean;
  ticked: boolean;
  onTick?: ((rowId: string) => void) | undefined;
  showNumber: boolean;
  selected?: string | null | undefined;
  numeric?: ReadonlySet<string> | undefined;
  marks?: Marks | undefined;
  extraClass?: string | undefined;
  onEdit?: ((rowId: string, columnId: string, value: string) => void) | undefined;
}

export function TableRow({
  row,
  index,
  columns,
  tickable,
  ticked,
  onTick,
  showNumber,
  selected,
  numeric,
  marks,
  extraClass,
  onEdit,
}: Props) {
  const isNew = marks?.rows.has(row.id) === true;
  const rowClass = [ticked ? 'is-ticked' : '', isNew ? 'is-new' : '', extraClass ?? '']
    .filter((name) => name !== '')
    .join(' ');

  return (
    <tr class={rowClass === '' ? undefined : rowClass}>
      {tickable ? (
        <td class="table__tick">
          <input
            type="checkbox"
            aria-label={format(ui.view.selectRow, { n: index + 1 })}
            checked={ticked}
            onChange={() => onTick?.(row.id)}
          />
        </td>
      ) : null}
      {showNumber ? <td class="table__number">{index + 1}</td> : null}
      {columns.map((column) => {
        const changed = marks?.cells.has(cellKey(row.id, column.id)) === true;
        const classes = [
          selected === column.id ? 'is-selected' : '',
          changed ? 'is-changed' : '',
          numeric?.has(column.id) === true ? 'is-numeric' : '',
        ]
          .filter((name) => name !== '')
          .join(' ');
        const className = classes === '' ? undefined : classes;

        if (onEdit !== undefined) {
          return (
            <TableCell
              key={column.id}
              value={cell(row, column.id)}
              label={format(ui.view.editCell, { column: column.name, n: index + 1 })}
              className={className}
              onCommit={(value) => onEdit(row.id, column.id, value)}
            />
          );
        }
        return (
          <td key={column.id} class={className}>
            {isNew && column === columns[0] ? <Mark label={marks?.labels.row ?? ''} /> : null}
            {changed ? <Mark label={marks?.labels.cell ?? ''} /> : null}
            {cell(row, column.id)}
          </td>
        );
      })}
    </tr>
  );
}
