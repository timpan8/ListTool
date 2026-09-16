import type { Dataset } from '../core/model';
import { ui } from '../i18n';
import { format, plural } from '../i18n/format';
import { DataTable } from './DataTable';

const PREVIEW_ROWS = 5;

interface Props {
  parserName: string;
  preview: Dataset;
  hasText: boolean;
}

/** What the current parser and options make of the input: the counts, then the rows. */
export function ImportPreview({ parserName, preview, hasText }: Props) {
  return (
    <>
      <p class="notice" role="status">
        {hasText
          ? format(ui.import.detected, {
              parser: parserName,
              rows: plural(preview.rows.length, ui.status.rows),
              columns: plural(preview.columns.length, ui.import.columns),
            })
          : ui.import.detectedNothing}
      </p>

      <section class="preview">
        <h3 class="preview__title">{ui.import.preview}</h3>
        {preview.rows.length === 0 ? (
          <p class="field__help">{ui.import.previewEmpty}</p>
        ) : (
          <>
            <p class="field__help">{format(ui.import.previewNote, { n: PREVIEW_ROWS })}</p>
            <DataTable columns={preview.columns} rows={preview.rows.slice(0, PREVIEW_ROWS)} />
          </>
        )}
      </section>
    </>
  );
}
