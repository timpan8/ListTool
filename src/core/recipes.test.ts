import { describe, expect, it } from 'vitest';
import { applyRecipe, createRecipe, stepsForRecipe, withoutStep } from './recipes';
import { PARSE_STEP_ID, type Step } from './history';
import { cell } from './model';
import { parserById } from '../parsers';
import { toolById } from '../tools';
import { OUTLOOK_RECIPIENTS, listOf } from '../test/fixtures';

const LOOKUP = { tool: toolById, parser: parserById };
const MESSAGES = {
  unknownTool: 'unknown tool',
  needsSecondList: (name: string) => `needs ${name || 'a second list'}`,
  noRawInput: 'no original input',
  scopeDropped: 'scope dropped',
};

function step(toolId: string, options: Record<string, unknown> = {}): Step {
  return { toolId, options, summary: '', at: 0 };
}

/** SPEC §8's example: Recipients → Trim → Lowercase email → Dedupe by email → Sort by last. */
const OUTLOOK_CLEANUP = createRecipe(
  'r1',
  'Outlook cleanup',
  [
    step(PARSE_STEP_ID, { parserId: 'recipients', nameOrder: 'last-first' }),
    step('trim-whitespace', { column: '' }),
    step('change-case', { column: 'email', mode: 'lower' }),
    step('remove-duplicates', { column: 'email', trim: true, ignoreCase: true }),
    step('sort', { column: 'last', direction: 'asc', by: 'value', locale: 'sv', numeric: true }),
  ],
  0,
);

describe('the SPEC §8 recipe, replayed on fresh input', () => {
  const fresh = {
    ...listOf('placeholder'),
    rawInput:
      'OBERG ÅSA <ASA.OBERG@Example.com>; andersson anna < Anna.Andersson@Example.com >; ' +
      'andersson anna <anna.andersson@example.com>; berg bo <bo.berg@example.com>',
  };

  const result = applyRecipe(OUTLOOK_CLEANUP, fresh, LOOKUP, MESSAGES);

  it('runs every step', () => {
    expect(result.applied).toHaveLength(5);
    expect(result.warnings).toEqual([]);
  });

  it('parses, lowercases, dedupes and sorts, in that order', () => {
    expect(result.output.rows.map((row) => cell(row, 'email'))).toEqual([
      'anna.andersson@example.com',
      'bo.berg@example.com',
      'asa.oberg@example.com',
    ]);
  });

  it('sorts the surnames with Swedish rules, so Öberg lands last', () => {
    expect(result.output.rows.map((row) => cell(row, 'last'))).toEqual([
      'andersson',
      'berg',
      'OBERG',
    ]);
  });

  it('keeps the tab identity through every step', () => {
    expect(result.output.id).toBe(fresh.id);
    expect(result.output.name).toBe(fresh.name);
  });

  it('carries the summary each step produced this time', () => {
    expect(result.applied[3]?.summary).toContain('Removed 1 duplicate');
  });

  it('replays the same way twice', () => {
    expect(applyRecipe(OUTLOOK_CLEANUP, fresh, LOOKUP, MESSAGES).output).toEqual(result.output);
  });

  it('works on the exact Outlook fixture too', () => {
    const outlook = { ...listOf('x'), rawInput: OUTLOOK_RECIPIENTS };
    const replayed = applyRecipe(OUTLOOK_CLEANUP, outlook, LOOKUP, MESSAGES);
    expect(replayed.output.rows.map((row) => cell(row, 'last'))).toEqual([
      'last1',
      'last2',
      'last3',
    ]);
  });
});

describe('applyRecipe', () => {
  it('skips an unknown tool with a warning rather than failing', () => {
    const recipe = createRecipe('r', 'r', [step('no-such-tool'), step('trim-whitespace')], 0);
    const result = applyRecipe(recipe, listOf('  a  '), LOOKUP, MESSAGES);

    expect(result.warnings).toEqual(['unknown tool']);
    expect(result.applied).toHaveLength(1);
    expect(cell(result.output.rows[0]!, 'value')).toBe('a');
  });

  it('skips a dual tool when nothing can find its second list', () => {
    const recipe = createRecipe('r', 'r', [step('set-operation')], 0);
    expect(applyRecipe(recipe, listOf('a'), LOOKUP, MESSAGES).warnings).toEqual([
      'needs a second list',
    ]);
  });

  describe('a dual step', () => {
    const leads = { ...listOf('a', 'z'), id: 'd2', name: 'Leads' };
    const lookup = {
      ...LOOKUP,
      dataset: (id: string, name: string) =>
        [leads].find((candidate) => candidate.id === id) ??
        [leads].find((candidate) => candidate.name === name),
    };
    const remove = step('remove-rows-in-b', {
      keyA: ['value'],
      keyB: ['value'],
      secondListId: 'd2',
      secondListName: 'Leads',
    });

    it('runs against the list found by id', () => {
      const result = applyRecipe(createRecipe('r', 'r', [remove], 0), listOf('a', 'b'), lookup, MESSAGES);
      expect(result.warnings).toEqual([]);
      expect(result.output.rows.map((row) => cell(row, 'value'))).toEqual(['b']);
    });

    it('falls back to the list found by name', () => {
      const renumbered = { ...remove, options: { ...remove.options, secondListId: 'd99' } };
      const result = applyRecipe(createRecipe('r', 'r', [renumbered], 0), listOf('a', 'b'), lookup, MESSAGES);
      expect(result.output.rows.map((row) => cell(row, 'value'))).toEqual(['b']);
    });

    it('is skipped, naming the list, when neither is open', () => {
      const gone = { ...remove, options: { ...remove.options, secondListId: 'd99', secondListName: 'Old leads' } };
      const result = applyRecipe(createRecipe('r', 'r', [gone], 0), listOf('a', 'b'), lookup, MESSAGES);
      expect(result.warnings).toEqual(['needs Old leads']);
      expect(result.output.rows).toHaveLength(2);
    });
  });

  it('runs a step that was scoped to ticked rows on the whole list, and says so', () => {
    const scoped = { ...step('trim-whitespace', { column: '' }), scope: { rows: ['r1'] } };
    const result = applyRecipe(createRecipe('r', 'r', [scoped], 0), listOf(' a ', ' b '), LOOKUP, MESSAGES);
    expect(result.warnings).toEqual(['scope dropped']);
    expect(result.output.rows.map((row) => cell(row, 'value'))).toEqual(['a', 'b']);
    expect(result.applied[0]).not.toHaveProperty('scope');
  });

  it('skips a re-parse when the list has no original input', () => {
    const noRaw = { ...listOf('a') };
    delete noRaw.rawInput;
    const recipe = createRecipe('r', 'r', [step(PARSE_STEP_ID, { parserId: 'lines' })], 0);
    expect(applyRecipe(recipe, noRaw, LOOKUP, MESSAGES).warnings).toEqual(['no original input']);
  });

  it('skips a re-parse naming a parser that no longer exists', () => {
    const recipe = createRecipe('r', 'r', [step(PARSE_STEP_ID, { parserId: 'gone' })], 0);
    expect(applyRecipe(recipe, listOf('a'), LOOKUP, MESSAGES).warnings).toEqual(['unknown tool']);
  });

  it('passes a tool warning through', () => {
    const recipe = createRecipe('r', 'r', [step('find-replace', { find: '[', regex: true })], 0);
    expect(applyRecipe(recipe, listOf('a'), LOOKUP, MESSAGES).warnings[0]).toContain(
      'not a valid regular expression',
    );
  });

  it('does nothing for a recipe with no steps', () => {
    const recipe = createRecipe('r', 'r', [], 0);
    expect(applyRecipe(recipe, listOf('a'), LOOKUP, MESSAGES).output.rows).toHaveLength(1);
  });

  it('never mutates the list it replays on', () => {
    const input = listOf('  a  ');
    const before = JSON.stringify(input);
    applyRecipe(OUTLOOK_CLEANUP, input, LOOKUP, MESSAGES);
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe('withoutStep', () => {
  it('removes one step and keeps the rest in order', () => {
    const edited = withoutStep(OUTLOOK_CLEANUP, 1);
    expect(edited.steps.map((entry) => entry.toolId)).toEqual([
      PARSE_STEP_ID,
      'change-case',
      'remove-duplicates',
      'sort',
    ]);
  });

  it('leaves the original recipe alone', () => {
    withoutStep(OUTLOOK_CLEANUP, 0);
    expect(OUTLOOK_CLEANUP.steps).toHaveLength(5);
  });

  it('ignores an index that is not there', () => {
    expect(withoutStep(OUTLOOK_CLEANUP, 99).steps).toHaveLength(5);
  });
});

describe('stepsForRecipe', () => {
  const parsed = {
    ...listOf('a'),
    parse: { parserId: 'recipients', options: { nameOrder: 'last-first' } },
  };

  it('puts the parse that produced the list first', () => {
    const steps = stepsForRecipe(parsed, [step('trim-whitespace')], 'Read as Recipients');
    expect(steps[0]?.toolId).toBe(PARSE_STEP_ID);
    expect(steps[0]?.options).toEqual({ parserId: 'recipients', nameOrder: 'last-first' });
    expect(steps[1]?.toolId).toBe('trim-whitespace');
  });

  it('carries the parser options, so the replay reads the input the same way', () => {
    const steps = stepsForRecipe(parsed, [], 'Read as Recipients');
    const replayed = applyRecipe(
      createRecipe('r', 'r', steps, 0),
      { ...listOf('x'), rawInput: OUTLOOK_RECIPIENTS },
      LOOKUP,
      MESSAGES,
    );
    expect(replayed.output.rows.map((row) => cell(row, 'last'))).toEqual([
      'last1',
      'last2',
      'last3',
    ]);
  });

  it('adds nothing for a list that was never parsed', () => {
    const noParse = { ...listOf('a') };
    delete noParse.parse;
    expect(stepsForRecipe(noParse, [step('trim-whitespace')], 's')).toHaveLength(1);
  });

  it('never mutates the steps it is given', () => {
    const steps = [step('trim-whitespace')];
    stepsForRecipe(parsed, steps, 's');
    expect(steps).toHaveLength(1);
  });
});
