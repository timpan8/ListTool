import { useState } from 'preact/hooks';
import type { Dataset } from '../core/model';
import type { Options, Tool } from '../core/registry';
import { TOOL_CATEGORIES, toolById, tools } from '../tools';
import { favorites, recents, toggleFavorite } from '../core/store';
import { en } from '../i18n/en';
import { format } from '../i18n/format';
import { CheckupList } from './CheckupList';

interface Props {
  dataset: Dataset;
  /** Options come with a finding from the checkup, so the fix opens ready to preview. */
  onPick: (tool: Tool, options?: Options) => void;
}

function matches(tool: Tool, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  return [tool.name, tool.description, ...tool.keywords]
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

/** Search, favourites, recents, then categories — all read from the registry. */
export function ToolPicker({ dataset, onPick }: Props) {
  const [query, setQuery] = useState('');
  const fits = (tool: Tool): boolean => tool.appliesTo?.(dataset) ?? true;
  const available = tools.filter((tool) => fits(tool) && matches(tool, query));

  const searching = query.trim() !== '';
  const starred = favorites.value
    .map(toolById)
    .filter((tool): tool is Tool => tool !== undefined && fits(tool));
  const recent = recents.value
    .map(toolById)
    .filter((tool): tool is Tool => tool !== undefined && fits(tool) && !starred.includes(tool));

  function entry(tool: Tool) {
    const isFavorite = favorites.value.includes(tool.id);
    return (
      <li key={tool.id} class="picker__row">
        <button type="button" class="picker__tool" onClick={() => onPick(tool)}>
          <span class="picker__name">{tool.name}</span>
          <span class="picker__description">{tool.description}</span>
        </button>
        <button
          type="button"
          class="picker__star"
          aria-pressed={isFavorite}
          aria-label={format(isFavorite ? en.panel.unfavorite : en.panel.favorite, {
            tool: tool.name,
          })}
          onClick={() => toggleFavorite(tool.id)}
        >
          {isFavorite ? '★' : '☆'}
        </button>
      </li>
    );
  }

  return (
    <div class="picker">
      <label class="field">
        <span class="visually-hidden">{en.panel.searchLabel}</span>
        <input
          type="search"
          placeholder={en.panel.search}
          value={query}
          onInput={(event) => setQuery(event.currentTarget.value)}
        />
      </label>

      {searching ? null : <CheckupList dataset={dataset} onPick={onPick} />}

      {!searching && starred.length > 0 ? (
        <section class="picker__group">
          <h3 class="picker__title">{en.panel.favorites}</h3>
          <ul class="picker__list">{starred.map(entry)}</ul>
        </section>
      ) : null}

      {!searching && recent.length > 0 ? (
        <section class="picker__group">
          <h3 class="picker__title">{en.panel.recents}</h3>
          <ul class="picker__list">{recent.map(entry)}</ul>
        </section>
      ) : null}

      {available.length === 0 ? (
        <p class="field__help">{format(en.panel.noTools, { query })}</p>
      ) : (
        TOOL_CATEGORIES.map((category) => {
          const inCategory = available.filter((tool) => tool.category === category);
          if (inCategory.length === 0) return null;
          return (
            <section key={category} class="picker__group">
              <h3 class="picker__title">{en.tools.categories[category]}</h3>
              <ul class="picker__list">{inCategory.map(entry)}</ul>
            </section>
          );
        })
      )}
    </div>
  );
}
