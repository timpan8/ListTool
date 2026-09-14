import type { Tool } from '../core/registry';
import { trimTool } from './clean/trim';
import { collapseWhitespaceTool } from './clean/collapse-whitespace';
import { removeBlankRowsTool } from './clean/remove-blank-rows';
import { removeDuplicatesTool } from './clean/remove-duplicates';
import { changeCaseTool } from './clean/change-case';
import { sortTool } from './transform/sort';
import { filterRowsTool } from './transform/filter-rows';
import { findReplaceTool } from './transform/find-replace';
import { prefixSuffixTool } from './transform/prefix-suffix';
import { splitColumnTool } from './columns/split-column';
import { swapColumnsTool } from './columns/swap-columns';
import { extractPatternTool } from './extract/extract-pattern';
import { compareListsTool } from './compare/compare-lists';
import { setOperationTool } from './compare/set-operation';
import { findDuplicatesTool } from './clean/find-duplicates';
import { validateEmailsTool } from './clean/validate-emails';
import { numberRowsTool } from './transform/number-rows';
import { reorderRowsTool } from './transform/reorder-rows';
import { removeRowsInBTool } from './transform/remove-rows-in-b';
import { mergeColumnsTool } from './columns/merge-columns';
import { renameColumnTool } from './columns/rename-column';
import { removeColumnTool } from './columns/remove-column';
import { moveColumnTool } from './columns/move-column';
import { buildDisplayNameTool } from './columns/build-display-name';
import { generateEmailTool } from './columns/generate-email';
import { countValuesTool } from './extract/count-values';

/**
 * The tool registry. Adding a tool means adding one module, its test, and one line
 * here — the shell is never edited for it.
 */
export const tools: Tool[] = [
  trimTool,
  collapseWhitespaceTool,
  removeBlankRowsTool,
  removeDuplicatesTool,
  changeCaseTool,
  findDuplicatesTool,
  validateEmailsTool,
  sortTool,
  filterRowsTool,
  findReplaceTool,
  prefixSuffixTool,
  numberRowsTool,
  reorderRowsTool,
  removeRowsInBTool,
  splitColumnTool,
  swapColumnsTool,
  mergeColumnsTool,
  renameColumnTool,
  removeColumnTool,
  moveColumnTool,
  buildDisplayNameTool,
  generateEmailTool,
  extractPatternTool,
  countValuesTool,
  compareListsTool,
  setOperationTool,
];

export function toolById(id: string): Tool | undefined {
  return tools.find((tool) => tool.id === id);
}

/** The order categories are shown in — the order a list is usually worked through. */
export const TOOL_CATEGORIES: Tool['category'][] = [
  'clean',
  'transform',
  'columns',
  'extract',
  'compare',
];
