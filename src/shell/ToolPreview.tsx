import { useState } from 'preact/hooks';
import type { DatasetDiff } from '../core/diff';
import type { Dataset } from '../core/model';
import { numericColumns } from '../core/profile';
import { ui } from '../i18n';
import { format } from '../i18n/format';
import { DataTable } from './DataTable';
import { marksFromDiff } from './marks';
import { previewRows, PREVIEW_ROWS } from './preview';

interface Props {
  output: Dataset;
  summary: string;
  warnings?: string[];
  /** What the tool changed, so the preview can show it rather than describe it. */
  diff?: DatasetDiff;
}

/** The summary, the warnings and the rows of what a tool would produce — changed ones first. */
export function ToolPreview({ output, summary, warnings, diff }: Props) {
  const [expanded, setExpanded] = useState(false);
  const preview =
    diff === undefined
      ? {
          rows: output.rows.slice(0, PREVIEW_ROWS),
          caption: format(ui.panel.previewNote, { n: Math.min(PREVIEW_ROWS, output.rows.length) }),
          expandable: false,
        }
      : previewRows(output, diff, expanded);

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
        <h4 class="preview__title">{ui.panel.preview}</h4>
        {output.rows.length === 0 ? (
          <p class="field__help">{ui.import.previewEmpty}</p>
        ) : (
          <>
            <p class="field__help preview__caption">
              <span>{preview.caption}</span>
              {preview.expandable ? (
                <button
                  type="button"
                  class="button button--quiet"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? ui.panel.previewFewer : ui.panel.previewAll}
                </button>
              ) : null}
            </p>
            <DataTable
              columns={output.columns}
              rows={preview.rows}
              numeric={numericColumns(output)}
              {...(diff === undefined ? {} : { marks: marksFromDiff(diff) })}
            />
          </>
        )}
      </section>
    </>
  );
}
