import type { Dataset } from '../core/model';
import type { Tool } from '../core/registry';
import type { Settings } from '../core/settings';
import { format } from '../i18n/format';
import { en } from '../i18n/en';
import { tools } from '../tools';
import { applyTool } from './edits';
import type { PanelIntent } from './panelIntent';
import { startingOptions, withSelection } from './toolOptions';

export interface SelectionAction {
  id: string;
  label: string;
  run: () => void;
}

/** The tools that take the ticked rows: every registered tool declaring a `rows` field. */
export function selectionTools(dataset: Dataset): Tool[] {
  return tools.filter(
    (tool) =>
      tool.options.some((field) => field.type === 'rows') && (tool.appliesTo?.(dataset) ?? true),
  );
}

/**
 * What the ticked rows offer, read from the registry: a tool's presets run at once with
 * the ticks filled in; a tool without presets opens with the ticks filled in. The shell
 * never learns a tool's name to do this — a new tool with a `rows` field turns up here.
 */
export function selectionActions(
  dataset: Dataset,
  ticked: string[],
  settings: Settings,
  onIntent: (intent: PanelIntent) => void,
): SelectionAction[] {
  // One-click presets lead; a tool that still needs its form follows.
  const direct: SelectionAction[] = [];
  const opening: SelectionAction[] = [];
  for (const tool of selectionTools(dataset)) {
    const presets = tool.presets ?? [];
    for (const preset of presets) {
      direct.push({
        id: `${tool.id}:${preset.id}`,
        label: preset.label,
        run: () =>
          void applyTool(dataset, tool.id, {
            ...withSelection(tool.options, startingOptions(tool, settings), ticked),
            ...preset.options,
          }),
      });
    }
    if (presets.length === 0) {
      opening.push({
        id: tool.id,
        label: format(en.view.openTool, { tool: tool.name }),
        run: () => onIntent({ kind: 'tool', tool }),
      });
    }
  }
  return [...direct, ...opening];
}
