import type { DatasetDiff } from '../core/diff';
import { ui } from '../i18n';

/**
 * What a table points at: cells, rows and columns to mark, and the word each mark
 * carries for a screen reader. The table knows nothing about why — a tool's diff and a
 * comparison's differences are the same marks with different words.
 */
export interface Marks {
  /** `cellKey(rowId, columnId)` of every marked cell. */
  cells: ReadonlySet<string>;
  rows: ReadonlySet<string>;
  columns: ReadonlySet<string>;
  labels: { cell: string; row: string; column: string };
}

/** The marks a tool's preview shows: what changed, what is new. */
export function marksFromDiff(diff: DatasetDiff): Marks {
  return {
    cells: diff.changedCells,
    rows: diff.addedRows,
    columns: diff.addedColumns,
    labels: {
      cell: ui.panel.changedCell,
      row: ui.panel.addedRow,
      column: ui.panel.addedColumn,
    },
  };
}
