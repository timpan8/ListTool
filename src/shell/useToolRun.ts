import { useMemo } from 'preact/hooks';
import { diffDatasets, type DatasetDiff } from '../core/diff';
import type { Dataset } from '../core/model';
import type { Options, Tool } from '../core/registry';
import { runOnRows, type ScopedResult } from '../core/scope';
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

/** One run: on the whole list, or on the ticked rows only, merged back where it can be. */
export function runTool(
  tool: Tool,
  dataset: Dataset,
  chosen: Options,
  second: Dataset | undefined,
  scope: string[] | null,
): ScopedResult {
  if (scope !== null && scope.length > 0) return runOnRows(tool, dataset, scope, chosen, second);
  return { ...tool.run(dataset, chosen, second), merged: true };
}

export interface ToolRun {
  chosen: Options;
  result: ScopedResult;
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
  /** The rows to run on, or null for the whole list. */
  scope: string[] | null,
): ToolRun {
  const chosen = useMemo(
    () => finalOptions(tool, options, dataset, second, ticked),
    [tool, options, dataset, second, ticked],
  );
  const result = useMemo(
    () => runTool(tool, dataset, chosen, second, scope),
    [tool, dataset, chosen, second, scope],
  );
  const diff = useMemo(() => diffDatasets(dataset, result.output), [dataset, result]);
  return { chosen, result, diff };
}
