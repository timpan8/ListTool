import { useState } from 'preact/hooks';
import type { Dataset } from '../core/model';
import { ui } from '../i18n';
import { format } from '../i18n/format';
import { buildCommands, searchCommands, type CommandHandlers } from './commands';
import { Dialog } from './Dialog';

interface Props extends CommandHandlers {
  dataset: Dataset | null;
  onClose: () => void;
}

/** The fast path to everything: fuzzy search, arrow keys, Enter. */
export function CommandPalette({ dataset, onClose, ...handlers }: Props) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const commands = searchCommands(buildCommands(dataset, handlers), query);
  const index = Math.min(active, Math.max(commands.length - 1, 0));

  function run(at: number): void {
    const command = commands[at];
    if (command === undefined) return;
    onClose();
    command.run();
  }

  return (
    <Dialog title={ui.palette.title} onClose={onClose}>
      <div class="field">
        <label class="visually-hidden" for="palette-query">
          {ui.palette.title}
        </label>
        <input
          id="palette-query"
          type="search"
          autofocus
          placeholder={ui.palette.placeholder}
          value={query}
          onInput={(event) => {
            setQuery(event.currentTarget.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive(Math.min(index + 1, commands.length - 1));
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive(Math.max(index - 1, 0));
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              run(index);
            }
          }}
        />
        <p class="field__help">{ui.palette.move}</p>
      </div>

      {commands.length === 0 ? (
        <p class="field__help">{format(ui.palette.empty, { query })}</p>
      ) : (
        <ul class="palette__list">
          {commands.map((command, at) => (
            <li key={command.id}>
              <button
                type="button"
                class={at === index ? 'palette__item is-active' : 'palette__item'}
                aria-current={at === index ? 'true' : undefined}
                onMouseEnter={() => setActive(at)}
                onClick={() => run(at)}
              >
                <span>{command.label}</span>
                <span class="palette__group">{command.group}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
