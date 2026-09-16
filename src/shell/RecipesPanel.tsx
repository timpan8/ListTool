import { useState } from 'preact/hooks';
import { appliedSteps, PARSE_STEP_ID, type Step, type History } from '../core/history';
import type { Dataset } from '../core/model';
import { stepsForRecipe, type Recipe } from '../core/recipes';
import {
  recipes,
  removeRecipe,
  removeRecipeStep,
  runRecipe,
  saveRecipe,
  setNotice,
} from '../core/store';
import { parserById } from '../parsers';
import { toolById } from '../tools';
import { ui } from '../i18n';
import { format, plural } from '../i18n/format';

interface Props {
  dataset: Dataset;
  history: History;
}

const LOOKUP = { tool: toolById, parser: parserById };
const MESSAGES = {
  unknownTool: ui.recipes.skippedUnknown,
  needsSecondList: (name: string) => format(ui.recipes.skippedDual, { name }),
  noRawInput: ui.recipes.skippedNoRaw,
  scopeDropped: ui.recipes.scopeDropped,
};

/** A re-parse step has no Tool behind it, so it is named after the parser it runs. */
function stepLabel(step: Step): string {
  if (step.toolId !== PARSE_STEP_ID) return toolById(step.toolId)?.name ?? step.toolId;
  const parserId = typeof step.options['parserId'] === 'string' ? step.options['parserId'] : '';
  return format(ui.palette.reparseAs, { parser: parserById(parserId)?.name ?? parserId });
}

function summaryOf(recipe: Recipe, applied: { summary: string }[]): string {
  return format(ui.recipes.applied, {
    recipe: recipe.name,
    steps: plural(applied.length, ui.recipes.steps),
  });
}

/** Save the steps behind this list, and replay any saved recipe on it. */
export function RecipesPanel({ dataset, history }: Props) {
  const [name, setName] = useState('');
  // The parse that produced this list belongs in the recipe, so a replay re-reads the
  // original input the same way before anything else runs.
  const steps = stepsForRecipe(
    history.initial,
    appliedSteps(history),
    format(ui.steps.parse, {
      parser: parserById(history.initial.parse?.parserId ?? '')?.name ?? '',
      rows: '',
    }).trim(),
  );

  function save(): void {
    const id = saveRecipe(name, steps, Date.now());
    if (id === null) return;
    setNotice(format(ui.recipes.saved, { recipe: name.trim() }));
    setName('');
  }

  return (
    <div class="recipes">
      <section class="recipes__save">
        <h3 class="field__label">{ui.recipes.save}</h3>
        {appliedSteps(history).length === 0 ? (
          <p class="field__help">{ui.recipes.nothingToSave}</p>
        ) : (
          <div class="field">
            <label class="field__label" for="recipe-name">
              {ui.recipes.nameLabel}
            </label>
            <input
              id="recipe-name"
              type="text"
              placeholder={ui.recipes.namePlaceholder}
              value={name}
              onInput={(event) => setName(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') save();
              }}
            />
            <button
              type="button"
              class="button button--primary"
              disabled={name.trim() === ''}
              onClick={save}
            >
              {ui.recipes.saveAction}
            </button>
          </div>
        )}
      </section>

      {recipes.value.length === 0 ? (
        <p class="field__help">{ui.recipes.empty}</p>
      ) : (
        <ul class="recipes__list">
          {recipes.value.map((recipe) => (
            <li key={recipe.id} class="recipes__item">
              <div class="recipes__head">
                <span class="picker__name">{recipe.name}</span>
                <span class="field__help">{plural(recipe.steps.length, ui.recipes.steps)}</span>
              </div>

              <ol class="recipes__steps">
                {recipe.steps.map((step, index) => (
                  <li key={`${step.toolId}-${index}`}>
                    <span>{stepLabel(step)}</span>
                    <button
                      type="button"
                      class="button button--quiet"
                      aria-label={ui.recipes.removeStep}
                      onClick={() => removeRecipeStep(recipe.id, index)}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ol>

              <div class="recipes__actions">
                <button
                  type="button"
                  class="button button--quiet"
                  aria-label={format(ui.recipes.removeNamed, { recipe: recipe.name })}
                  onClick={() => removeRecipe(recipe.id)}
                >
                  {ui.recipes.remove}
                </button>
                <button
                  type="button"
                  class="button"
                  aria-label={format(ui.recipes.applyTo, {
                    recipe: recipe.name,
                    list: dataset.name,
                  })}
                  onClick={() => {
                    const warnings = runRecipe(
                      dataset.id,
                      recipe.id,
                      LOOKUP,
                      MESSAGES,
                      summaryOf,
                    );
                    if (warnings.length > 0) setNotice(warnings[0] ?? '');
                  }}
                >
                  {ui.recipes.apply}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
