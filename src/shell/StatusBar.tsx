import { useMemo } from 'preact/hooks';
import { datasetStats } from '../core/stats';
import { activeDataset, notice, selectedColumn } from '../core/store';
import { ui } from '../i18n';
import { format, plural } from '../i18n/format';

/** rows · unique · blank · duplicates for the active list, plus the status message. */
export function StatusBar() {
  const dataset = activeDataset.value;
  const column = selectedColumn.value;
  const message = notice.value;

  // Counted once per list and column, not once per status message.
  const stats = useMemo(
    () => (dataset === null ? null : datasetStats(dataset, column ?? undefined)),
    [dataset, column],
  );

  if (dataset === null || stats === null) {
    return (
      <footer class="statusbar">
        <p class="statusbar__notice" role="status">
          {message}
        </p>
      </footer>
    );
  }

  const columnName =
    dataset.columns.find((candidate) => candidate.id === column)?.name ?? ui.status.wholeRow;

  const parts = [
    plural(stats.rows, ui.status.rows),
    format(ui.status.unique, { n: stats.unique }),
    format(ui.status.blank, { n: stats.blank }),
    format(ui.status.duplicates, { n: stats.duplicates }),
    format(ui.status.countedOn, { column: columnName }),
  ];

  return (
    <footer class="statusbar">
      <p class="statusbar__stats">{parts.join(ui.status.separator)}</p>
      <p class="statusbar__notice" role="status">
        {message}
      </p>
    </footer>
  );
}
