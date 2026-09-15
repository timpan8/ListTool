import type { Dataset } from './model';
import type { Finding, Tool } from './registry';

export interface Checkup {
  tool: Tool;
  finding: Finding;
}

/**
 * What the tools would find in this list as it stands. Nothing is changed by asking: a
 * check is as pure as a run, and the answer is only ever a way into the ordinary tool
 * with its options already set.
 *
 * Driven entirely by the registry — a tool that grows a `check` turns up here, and one
 * that never does costs nothing.
 */
export function checkup(dataset: Dataset, tools: Tool[]): Checkup[] {
  const found: Checkup[] = [];

  for (const tool of tools) {
    if (tool.check === undefined) continue;
    if (tool.appliesTo?.(dataset) === false) continue;
    const finding = tool.check(dataset);
    if (finding === null || finding === undefined || finding.count <= 0) continue;
    found.push({ tool, finding });
  }

  // Biggest first, and ties in registry order, so the same list always reads the same way.
  return found.sort((a, b) => b.finding.count - a.finding.count);
}
