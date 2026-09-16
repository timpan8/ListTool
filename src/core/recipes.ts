import { PARSE_STEP_ID, type Step } from './history';
import type { Dataset } from './model';
import { stringOption, type Parser, type Tool } from './registry';

export interface Recipe {
  id: string;
  name: string;
  steps: Step[];
  at: number;
}

export interface ReplayLookup {
  tool: (id: string) => Tool | undefined;
  parser: (id: string) => Parser | undefined;
  /**
   * The list a dual step compared with, by the id it had and then by its name — the id
   * survives a session, the name survives a re-import. Never the list being worked on.
   */
  dataset?: (id: string, name: string) => Dataset | undefined;
}

export interface ReplayMessages {
  unknownTool: string;
  needsSecondList: (name: string) => string;
  noRawInput: string;
  /** A step that ran on ticked rows runs on the whole list here: row ids mean nothing elsewhere. */
  scopeDropped: string;
}

export interface ReplayResult {
  output: Dataset;
  /** The steps that actually ran, with the summaries this replay produced. */
  applied: Step[];
  warnings: string[];
}

export function createRecipe(id: string, name: string, steps: Step[], at: number): Recipe {
  return { id, name, steps, at };
}

/**
 * The steps a recipe should hold for a list. Importing is not a step — it is the history's
 * starting point — so the parse that produced the list is prepended here. Without it,
 * SPEC §8's "Recipients → Trim → …" would start at Trim and only ever work on lists that
 * happened to be read the same way.
 */
export function stepsForRecipe(initial: Dataset, steps: Step[], summary: string): Step[] {
  const parse = initial.parse;
  if (parse === undefined) return [...steps];

  return [
    {
      toolId: PARSE_STEP_ID,
      options: { parserId: parse.parserId, ...parse.options },
      summary,
      at: 0,
    },
    ...steps,
  ];
}

export function withoutStep(recipe: Recipe, index: number): Recipe {
  return { ...recipe, steps: recipe.steps.filter((_, at) => at !== index) };
}

/**
 * Replay a recipe on a dataset. Every step is one tool id plus its options, which is why
 * a recipe is a small feature rather than a rewrite. A step that cannot run here — an
 * unknown tool, a dual tool with no second list, a re-parse with no original input — is
 * skipped with a warning rather than failing the whole recipe.
 */
export function applyRecipe(
  recipe: Recipe,
  input: Dataset,
  lookup: ReplayLookup,
  messages: ReplayMessages,
): ReplayResult {
  let output = input;
  const applied: Step[] = [];
  const warnings: string[] = [];

  for (const step of recipe.steps) {
    if (step.toolId === PARSE_STEP_ID) {
      const parserId = typeof step.options['parserId'] === 'string' ? step.options['parserId'] : '';
      const parser = lookup.parser(parserId);
      if (parser === undefined) {
        warnings.push(messages.unknownTool);
        continue;
      }
      if (output.rawInput === undefined) {
        warnings.push(messages.noRawInput);
        continue;
      }
      const parsed = parser.parse(output.rawInput, step.options);
      output = { ...parsed, id: output.id, name: output.name };
      applied.push(step);
      continue;
    }

    const tool = lookup.tool(step.toolId);
    if (tool === undefined) {
      warnings.push(messages.unknownTool);
      continue;
    }
    let second: Dataset | undefined;
    if (tool.arity === 'dual') {
      // The list it compared with has to be open, under the same id or the same name.
      const name = stringOption(step.options, 'secondListName', '');
      second = lookup.dataset?.(stringOption(step.options, 'secondListId', ''), name);
      if (second === undefined) {
        warnings.push(messages.needsSecondList(name));
        continue;
      }
    }

    if (step.scope !== undefined) warnings.push(messages.scopeDropped);
    const result = tool.run(output, step.options, second);
    output = { ...result.output, id: output.id, name: output.name };
    const { scope: _scope, ...unscoped } = step;
    applied.push({ ...unscoped, summary: result.summary });
    warnings.push(...(result.warnings ?? []));
  }

  return { output, applied, warnings };
}
