import { PARSE_STEP_ID } from '../core/history';
import type { Dataset } from '../core/model';
import type { Options, Parser } from '../core/registry';
import { addDataset, applyStep } from '../core/store';
import { ui } from '../i18n';
import { format, plural } from '../i18n/format';
import { appendRowsTool } from '../tools/transform/append-rows';

interface Destination {
  /** Set when re-parsing an open list: the parsed rows replace it. */
  reparse: Dataset | null;
  /** Set when the rows should go at the end of a list that is already open. */
  appendTo: Dataset | null;
  /** Name for a brand new list. */
  name: string;
}

/**
 * Where a parsed list lands. All three ways record a step, so all three undo — including
 * adding to an open list, which is the ordinary append tool rather than a quiet write.
 */
export function importInto(preview: Dataset, parser: Parser, options: Options, to: Destination): void {
  if (to.reparse !== null) {
    applyStep(
      to.reparse.id,
      {
        toolId: PARSE_STEP_ID,
        options: { parserId: parser.id, ...options },
        summary: format(ui.steps.parse, {
          parser: parser.name,
          rows: plural(preview.rows.length, ui.status.rows),
        }),
        at: Date.now(),
      },
      preview,
    );
    return;
  }

  if (to.appendTo !== null) {
    const result = appendRowsTool.run(to.appendTo, { byName: true }, preview);
    applyStep(
      to.appendTo.id,
      {
        toolId: appendRowsTool.id,
        options: { byName: true },
        summary: result.summary,
        at: Date.now(),
      },
      result.output,
    );
    return;
  }

  addDataset(preview, to.name);
}
