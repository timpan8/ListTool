import type { Dataset } from '../core/model';
import type { Options } from '../core/registry';
import { applyStep } from '../core/store';
import { toolById } from '../tools';

/**
 * Direct manipulation in the table goes through the ordinary registry: editing a cell is
 * the `set-value` tool with one row ticked. So it lands in history, it undoes, and the
 * shell never writes into a dataset itself.
 *
 * Returns false when the tool handed its input straight back, which is how a tool says
 * there was nothing to do. A tool that rebuilds an identical list still records a step:
 * the user asked for it, and history should show what they asked for.
 */
export function applyTool(dataset: Dataset, toolId: string, options: Options): boolean {
  const tool = toolById(toolId);
  if (tool === undefined) return false;

  const result = tool.run(dataset, options);
  if (result.output === dataset) return false;

  applyStep(
    dataset.id,
    { toolId, options, summary: result.summary, at: Date.now() },
    result.output,
  );
  return true;
}

/** One cell, one step. */
export function editCell(
  dataset: Dataset,
  rowId: string,
  columnId: string,
  value: string,
): boolean {
  return applyTool(dataset, 'set-value', { rows: [rowId], column: columnId, value });
}
