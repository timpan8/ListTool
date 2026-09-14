import { datasetStats } from '../core/stats';
import { activeDataset, notice, selectedColumn } from '../core/store';
import { en } from '../i18n/en';
import { format, plural } from '../i18n/format';

/** rows · unique · blank · duplicates for the active list, plus the status message. */
export function StatusBar() {
  const dataset = activeDataset.value;
  const column = selectedColumn.value;
  const message = notice.value;

  if (dataset === null) {
    return (
      <footer class="statusbar">
        <p class="statusbar__notice" role="status">
          {message}
        </p>
      </footer>
    );
  }

  const stats = datasetStats(dataset, column ?? undefined);
  const columnName =
    dataset.columns.find((candidate) => candidate.id === column)?.name ?? en.status.wholeRow;

  const parts = [
    plural(stats.rows, en.status.rows),
    format(en.status.unique, { n: stats.unique }),
    format(en.status.blank, { n: stats.blank }),
    format(en.status.duplicates, { n: stats.duplicates }),
    format(en.status.countedOn, { column: columnName }),
  ];

  return (
    <footer class="statusbar">
      <p class="statusbar__stats">{parts.join(en.status.separator)}</p>
      <p class="statusbar__notice" role="status">
        {message}
      </p>
    </footer>
  );
}
