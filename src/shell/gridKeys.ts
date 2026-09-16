const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/** The control a cell offers the keyboard, if it offers one. */
function controlIn(cell: HTMLTableCellElement | undefined): HTMLElement | null {
  return cell?.querySelector<HTMLElement>('button, input, [tabindex]') ?? null;
}

/**
 * Where an arrow key takes the focus in a table whose cells hold a button or a box:
 * the nearest control in that direction, skipping cells with none, such as row numbers.
 * null when the key is not an arrow or there is nowhere to go, so the browser keeps it.
 */
export function nextCell(from: HTMLElement, key: string): HTMLElement | null {
  if (!ARROWS.has(key)) return null;
  const cell = from.closest('td, th');
  const row = cell?.parentElement;
  const table = row?.closest('table');
  if (
    !(cell instanceof HTMLTableCellElement) ||
    !(row instanceof HTMLTableRowElement) ||
    !(table instanceof HTMLTableElement)
  ) {
    return null;
  }

  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const step = key === 'ArrowLeft' ? -1 : 1;
    for (let at = cell.cellIndex + step; at >= 0 && at < row.cells.length; at += step) {
      const found = controlIn(row.cells[at]);
      if (found !== null) return found;
    }
    return null;
  }

  const rows = Array.from(table.rows);
  const step = key === 'ArrowUp' ? -1 : 1;
  for (let at = rows.indexOf(row) + step; at >= 0 && at < rows.length; at += step) {
    const found = controlIn(rows[at]?.cells[cell.cellIndex]);
    if (found !== null) return found;
  }
  return null;
}
