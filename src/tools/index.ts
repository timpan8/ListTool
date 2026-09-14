import type { Tool } from '../core/registry';

/**
 * The tool registry. Empty until milestone 3 — the shell reads this array, so filling it
 * is the whole of "adding a tool".
 */
export const tools: Tool[] = [];

export function toolById(id: string): Tool | undefined {
  return tools.find((tool) => tool.id === id);
}
