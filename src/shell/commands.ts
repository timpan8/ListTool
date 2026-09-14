import type { Dataset } from '../core/model';
import type { Tool } from '../core/registry';
import { exporters } from '../exporters';
import { parsers } from '../parsers';
import { tools } from '../tools';
import { en } from '../i18n/en';
import { format } from '../i18n/format';

export interface Command {
  id: string;
  label: string;
  group: string;
  run: () => void;
}

export interface CommandHandlers {
  pickTool: (tool: Tool) => void;
  reparse: (parserId: string) => void;
  copyAs: (exporterId: string) => void;
}

/**
 * Everything the palette can run, built from the registries. A new tool, parser or
 * exporter appears here by existing — the palette has no list of its own.
 */
export function buildCommands(dataset: Dataset | null, handlers: CommandHandlers): Command[] {
  if (dataset === null) return [];

  const toolCommands = tools
    .filter((tool) => tool.appliesTo?.(dataset) ?? true)
    .map((tool) => ({
      id: `tool:${tool.id}`,
      label: tool.name,
      group: en.palette.groups.tool,
      run: () => handlers.pickTool(tool),
    }));

  const reparseCommands =
    dataset.rawInput === undefined
      ? []
      : parsers.map((parser) => ({
          id: `parse:${parser.id}`,
          label: format(en.palette.reparseAs, { parser: parser.name }),
          group: en.palette.groups.reparse,
          run: () => handlers.reparse(parser.id),
        }));

  const copyCommands = exporters.map((exporter) => ({
    id: `copy:${exporter.id}`,
    label: format(en.palette.copyAs, { exporter: exporter.name }),
    group: en.palette.groups.copy,
    run: () => handlers.copyAs(exporter.id),
  }));

  return [...toolCommands, ...reparseCommands, ...copyCommands];
}

/**
 * Subsequence matching: "rmdp" finds "Remove duplicates". Everything is scored so an
 * earlier, tighter match ranks first.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const needle = query.trim().toLowerCase();
  if (needle === '') return 0;

  const haystack = text.toLowerCase();
  const direct = haystack.indexOf(needle);
  if (direct !== -1) return direct;

  let at = 0;
  let span = 0;
  for (const char of needle) {
    const found = haystack.indexOf(char, at);
    if (found === -1) return null;
    span += found - at;
    at = found + 1;
  }
  // Scattered matches rank below every direct hit.
  return 1000 + span;
}

export function searchCommands(commands: Command[], query: string): Command[] {
  return commands
    .map((command) => ({ command, score: fuzzyScore(query, command.label) }))
    .filter((entry): entry is { command: Command; score: number } => entry.score !== null)
    .sort((a, b) => a.score - b.score)
    .map((entry) => entry.command);
}
