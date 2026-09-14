import type { Dataset } from '../core/model';
import { en } from '../i18n/en';
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
          ? format(en.import.detected, {
              parser: parserName,
              rows: plural(preview.rows.length, en.status.rows),
              columns: plural(preview.columns.length, en.import.columns),
            })
          : en.import.detectedNothing}
      </p>

      <section class="preview">
        <h3 class="preview__title">{en.import.preview}</h3>
        {preview.rows.length === 0 ? (
          <p class="field__help">{en.import.previewEmpty}</p>
        ) : (
          <>
            <p class="field__help">{format(en.import.previewNote, { n: PREVIEW_ROWS })}</p>
            <DataTable columns={preview.columns} rows={preview.rows.slice(0, PREVIEW_ROWS)} />
          </>
        )}
      </section>
    </>
  );
}
