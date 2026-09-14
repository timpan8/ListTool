import type { Dataset } from '../core/model';
import type { DatasetDiff } from '../core/diff';
import { en } from '../i18n/en';
import { format } from '../i18n/format';
import { DataTable } from './DataTable';

/** How much of the result the panel shows before you apply it. */
export const PREVIEW_ROWS = 8;

interface Props {
  output: Dataset;
  summary: string;
  warnings?: string[];
  /** What the tool changed, so the preview can point at it rather than describe it. */
  diff?: DatasetDiff;
}

/** The summary, the warnings and the first rows of what a tool would produce. */
export function ToolPreview({ output, summary, warnings, diff }: Props) {
  return (
    <>
      <p class="notice" role="status">
        {summary}
      </p>

      {(warnings ?? []).map((warning) => (
        <p key={warning} class="notice notice--warning" role="status">
          {warning}
        </p>
      ))}

      <section class="preview">
        <h4 class="preview__title">{en.panel.preview}</h4>
        {output.rows.length === 0 ? (
          <p class="field__help">{en.import.previewEmpty}</p>
        ) : (
          <>
            <p class="field__help">{format(en.panel.previewNote, { n: PREVIEW_ROWS })}</p>
            <DataTable
              columns={output.columns}
              rows={output.rows.slice(0, PREVIEW_ROWS)}
              {...(diff === undefined ? {} : { diff })}
            />
          </>
        )}
      </section>
    </>
  );
}
