import { useState } from 'preact/hooks';
import type { Dataset } from '../core/model';
import type { OptionField, Options, Tool } from '../core/registry';
import { TOOL_CATEGORIES, toolById, tools } from '../tools';
import { favorites, recents, toggleFavorite } from '../core/store';
import { ui } from '../i18n';
import { format } from '../i18n/format';
import { CheckupList } from './CheckupList';

interface Props {
  dataset: Dataset;
  /** Set from a column menu: only the tools that take one column, opened on it. */
  columnId?: string;
  onAllTools?: () => void;
  /** Options come with a finding from the checkup, so the fix opens ready to preview. */
  onPick: (tool: Tool, options?: Options) => void;
}

/** Categories folded shut stay shut for the session; a picker is opened many times. */
const folded = new Set<string>();

function matches(tool: Tool, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  return [tool.name, tool.description, ...tool.keywords]
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

/** The first field a tool has that names one column of this list. */
function columnField(tool: Tool): OptionField | undefined {
  return tool.options.find((field) => field.type === 'column' && field.from !== 'second');
}

/** Search, favourites, recents, then categories — all read from the registry. */
export function ToolPicker({ dataset, columnId, onAllTools, onPick }: Props) {
  const [query, setQuery] = useState('');
  const column = dataset.columns.find((candidate) => candidate.id === columnId);
  const fits = (tool: Tool): boolean =>
    (tool.appliesTo?.(dataset) ?? true) && (column === undefined || columnField(tool) !== undefined);
  const available = tools.filter((tool) => fits(tool) && matches(tool, query));
  const pick = (tool: Tool): void => {
    const field = column === undefined ? undefined : columnField(tool);
    onPick(tool, field === undefined ? undefined : { [field.key]: column?.id });
  };

  const searching = query.trim() !== '';
  const browsing = !searching && column === undefined;
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
        <button type="button" class="picker__tool" onClick={() => pick(tool)}>
          <span class="picker__name">{tool.name}</span>
          <span class="picker__description">{tool.description}</span>
        </button>
        <button
          type="button"
          class="picker__star"
          aria-pressed={isFavorite}
          aria-label={format(isFavorite ? ui.panel.unfavorite : ui.panel.favorite, {
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
      {column === undefined ? null : (
        <p class="view__selection" role="status">
          {format(ui.panel.toolsForColumn, { column: column.name })}
          <button type="button" class="button button--quiet" onClick={onAllTools}>
            {ui.panel.allTools}
          </button>
        </p>
      )}

      <label class="field">
        <span class="visually-hidden">{ui.panel.searchLabel}</span>
        <input
          type="search"
          placeholder={ui.panel.search}
          value={query}
          onInput={(event) => setQuery(event.currentTarget.value)}
        />
      </label>

      {browsing ? <CheckupList dataset={dataset} onPick={onPick} /> : null}

      {browsing && starred.length > 0 ? (
        <section class="picker__group">
          <h3 class="picker__title">{ui.panel.favorites}</h3>
          <ul class="picker__list">{starred.map(entry)}</ul>
        </section>
      ) : null}

      {browsing && recent.length > 0 ? (
        <section class="picker__group">
          <h3 class="picker__title">{ui.panel.recents}</h3>
          <ul class="picker__list">{recent.map(entry)}</ul>
        </section>
      ) : null}

      {available.length === 0 ? (
        <p class="field__help">{format(ui.panel.noTools, { query })}</p>
      ) : (
        TOOL_CATEGORIES.map((category) => {
          const inCategory = available.filter((tool) => tool.category === category);
          if (inCategory.length === 0) return null;
          return (
            <details
              key={category}
              class="picker__group"
              open={searching || !folded.has(category)}
              onToggle={(event) => {
                if (event.currentTarget.open) folded.delete(category);
                else folded.add(category);
              }}
            >
              <summary class="picker__title">
                {ui.tools.categories[category]}
                <span class="picker__count">{inCategory.length}</span>
              </summary>
              <ul class="picker__list">{inCategory.map(entry)}</ul>
            </details>
          );
        })
      )}
    </div>
  );
}
