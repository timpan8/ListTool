import { cell, type Column, type Row } from '../core/model';
import { en } from '../i18n/en';

interface Props {
  columns: Column[];
  rows: Row[];
  /** Column the status bar counts on; clicking a header toggles it. */
  selected?: string | null;
  onSelect?: (columnId: string | null) => void;
  showRowNumbers?: boolean;
}

/**
 * The one table in the app. The dataset view, the import preview and (later) compare
 * results all render through it, so nothing grows a table of its own.
 */
export function DataTable({ columns, rows, selected, onSelect, showRowNumbers }: Props) {
  return (
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            {showRowNumbers === true ? <th class="table__number">{en.view.rowNumber}</th> : null}
            {columns.map((column) => {
              const isSelected = selected === column.id;
              return (
                <th key={column.id}>
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
            <tr key={row.id}>
              {showRowNumbers === true ? <td class="table__number">{index + 1}</td> : null}
              {columns.map((column) => (
                <td key={column.id} class={selected === column.id ? 'is-selected' : undefined}>
                  {cell(row, column.id)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
