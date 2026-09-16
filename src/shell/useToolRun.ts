import { useMemo } from 'preact/hooks';
import { diffDatasets, type DatasetDiff } from '../core/diff';
import type { Dataset } from '../core/model';
import type { Options, Tool, ToolResult } from '../core/registry';
import { withColumnDefaults, withSelection } from './toolOptions';

/**
 * The options a tool really runs with: the form's values, every column field naming a
 * real column, and the table's ticks in every `rows` field.
 */
export function finalOptions(
  tool: Tool,
  options: Options,
  dataset: Dataset,
  second: Dataset | undefined,
  ticked: string[],
): Options {
  return withSelection(
    tool.options,
    withColumnDefaults(tool.options, options, dataset.columns, second?.columns ?? []),
    ticked,
  );
}

export interface ToolRun {
  chosen: Options;
  result: ToolResult;
  diff: DatasetDiff;
}

/**
 * Run the tool for the preview, and only when something it depends on has changed. A
 * render for any other reason — a tick elsewhere, a status message — no longer re-runs
 * a tool over ten thousand rows.
 */
export function useToolRun(
  tool: Tool,
  dataset: Dataset,
  options: Options,
  second: Dataset | undefined,
  ticked: string[],
): ToolRun {
  const chosen = useMemo(
    () => finalOptions(tool, options, dataset, second, ticked),
    [tool, options, dataset, second, ticked],
  );
  const result = useMemo(() => tool.run(dataset, chosen, second), [tool, dataset, chosen, second]);
  const diff = useMemo(() => diffDatasets(dataset, result.output), [dataset, result]);
  return { chosen, result, diff };
}
