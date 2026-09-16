import { changedFirst, type DatasetDiff } from '../core/diff';
import type { Dataset, Row } from '../core/model';
import { en } from '../i18n/en';
import { format, plural } from '../i18n/format';

/** How much of the result the panel shows before you apply it. */
export const PREVIEW_ROWS = 8;
/** How much it shows when asked for every changed row. */
export const PREVIEW_MAX = 200;

export interface Preview {
  rows: Row[];
  /** "First 8 of 27 changed rows" — what the rows on screen are. */
  caption: string;
  /** True when more changed rows exist than the short preview shows. */
  expandable: boolean;
}

/**
 * The rows a preview shows, changed ones first, and the sentence that says what they
 * are. A preview of the first eight rows of a thousand would show eight untouched rows
 * more often than not; putting the work first is what makes it a preview of the work.
 */
export function previewRows(output: Dataset, diff: DatasetDiff, expanded: boolean): Preview {
  const ordered = changedFirst(output, diff);
  const limit = expanded ? PREVIEW_MAX : PREVIEW_ROWS;
  const rows = ordered.rows.length > limit ? ordered.rows.slice(0, limit) : ordered.rows;
  const n = rows.length;
  const strings = en.panel;

  let caption: string;
  if (ordered.changed > n) {
    caption = format(strings.previewChanged, { n, changed: ordered.changed });
  } else if (ordered.changed > 0) {
    caption = format(strings.previewChangedFirst, { n, changed: ordered.changed });
  } else if (diff.addedColumns.size > 0) {
    caption = format(strings.previewNewColumns, {
      n,
      columns: plural(diff.addedColumns.size, strings.newColumns),
    });
  } else if (diff.removedRows > 0) {
    caption = format(strings.previewRemoved, {
      n,
      kept: output.rows.length,
      removed: diff.removedRows,
    });
  } else {
    caption = format(strings.previewUnchanged, { n });
  }

  return { rows, caption, expandable: ordered.changed > PREVIEW_ROWS };
}
