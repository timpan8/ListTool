import type { Options, Tool } from '../core/registry';

/**
 * What the side panel is asked to open: a tool (from the palette, a finding or a menu),
 * the tools that take one column, or one column's values. The panel decides which tab
 * that means; the asker never reaches into it.
 */
export type PanelIntent =
  | { kind: 'tool'; tool: Tool; options?: Options }
  | { kind: 'column-tools'; columnId: string }
  | { kind: 'column-values'; columnId: string };
