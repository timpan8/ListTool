import { useState } from 'preact/hooks';
import { activeId, close, duplicate, openDatasets, rename, setActive } from '../core/store';
import { ui } from '../i18n';
import { format } from '../i18n/format';

/** Above this many lists the strip also gets a jump menu, so it never has to grow. */
const OVERFLOW_AT = 4;

interface Props {
  onAdd: () => void;
}

export function DatasetTabs({ onAdd }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const datasets = openDatasets.value;
  const current = activeId.value;

  function commit(id: string, value: string): void {
    rename(id, value);
    setEditing(null);
  }

  return (
    <div class="tabs" role="group" aria-label={ui.tabs.label}>
      <div class="tabs__strip">
        {datasets.map((dataset) => (
          <span
            key={dataset.id}
            class={dataset.id === current ? 'tab is-active' : 'tab'}
            onDblClick={() => setEditing(dataset.id)}
          >
            {editing === dataset.id ? (
              <input
                class="tab__input"
                type="text"
                autofocus
                value={dataset.name}
                aria-label={ui.tabs.renamePrompt}
                onBlur={(event) => commit(dataset.id, event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commit(dataset.id, event.currentTarget.value);
                  if (event.key === 'Escape') setEditing(null);
                }}
              />
            ) : (
              <>
                <button
                  type="button"
                  class="tab__name"
                  aria-current={dataset.id === current ? 'true' : undefined}
                  onClick={() => setActive(dataset.id)}
                >
                  {dataset.name}
                </button>
                <button
                  type="button"
                  class="tab__close"
                  aria-label={format(ui.tabs.closeNamed, { name: dataset.name })}
                  onClick={() => close(dataset.id)}
                >
                  ✕
                </button>
              </>
            )}
          </span>
        ))}
        <button type="button" class="button button--quiet" title={ui.tabs.addHint} onClick={onAdd}>
          + {ui.tabs.add}
        </button>
      </div>

      <div class="tabs__aside">
        {datasets.length > OVERFLOW_AT ? (
          <label class="tabs__goto">
            <span class="visually-hidden">{ui.tabs.goTo}</span>
            <select
              value={current ?? ''}
              onChange={(event) => setActive(event.currentTarget.value)}
            >
              {datasets.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {current === null ? null : (
          <>
            <button
              type="button"
              class="button button--quiet"
              onClick={() => setEditing(current)}
            >
              {ui.tabs.rename}
            </button>
            <button
              type="button"
              class="button button--quiet"
              onClick={() => {
                const source = datasets.find((dataset) => dataset.id === current);
                if (source !== undefined) {
                  duplicate(current, format(ui.tabs.copySuffix, { name: source.name }));
                }
              }}
            >
              {ui.tabs.duplicate}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
