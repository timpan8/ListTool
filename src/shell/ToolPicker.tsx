import { useState } from 'preact/hooks';
import type { Dataset } from '../core/model';
import type { Tool } from '../core/registry';
import { TOOL_CATEGORIES, tools } from '../tools';
import { en } from '../i18n/en';
import { format } from '../i18n/format';

interface Props {
  dataset: Dataset;
  onPick: (tool: Tool) => void;
}

function matches(tool: Tool, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  return [tool.name, tool.description, ...tool.keywords]
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

/** Search, then categories. The list comes from the registry, never from the shell. */
export function ToolPicker({ dataset, onPick }: Props) {
  const [query, setQuery] = useState('');
  const available = tools.filter(
    (tool) => (tool.appliesTo?.(dataset) ?? true) && matches(tool, query),
  );

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

      {available.length === 0 ? (
        <p class="field__help">{format(en.panel.noTools, { query })}</p>
      ) : (
        TOOL_CATEGORIES.map((category) => {
          const inCategory = available.filter((tool) => tool.category === category);
          if (inCategory.length === 0) return null;
          return (
            <section key={category} class="picker__group">
              <h3 class="picker__title">{en.tools.categories[category]}</h3>
              <ul class="picker__list">
                {inCategory.map((tool) => (
                  <li key={tool.id}>
                    <button type="button" class="picker__tool" onClick={() => onPick(tool)}>
                      <span class="picker__name">{tool.name}</span>
                      <span class="picker__description">{tool.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
