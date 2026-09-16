import type { Dataset } from '../core/model';
import { ui } from '../i18n';
import { format } from '../i18n/format';

interface Props {
  /** The list already open, or null when there is none to add to. */
  openList: Dataset | null;
  append: boolean;
  onAppend: (append: boolean) => void;
  /** Hidden while re-parsing or appending: neither makes a new list to name. */
  showName: boolean;
  name: string;
  onName: (name: string) => void;
}

/** Where the parsed rows land, and what the new list is called if it is one. */
export function ImportTarget({ openList, append, onAppend, showName, name, onName }: Props) {
  return (
    <>
      {openList === null ? null : (
        <div class="field">
          <label class="field__label" for="import-target">
            {ui.import.target}
          </label>
          <select
            id="import-target"
            value={append ? 'append' : 'new'}
            onChange={(event) => onAppend(event.currentTarget.value === 'append')}
          >
            <option value="new">{ui.import.targetNew}</option>
            <option value="append">
              {format(ui.import.targetAppend, { name: openList.name })}
            </option>
          </select>
        </div>
      )}

      {showName ? (
        <div class="field">
          <label class="field__label" for="import-name">
            {ui.import.nameLabel}
          </label>
          <input
            id="import-name"
            type="text"
            value={name}
            onInput={(event) => onName(event.currentTarget.value)}
          />
        </div>
      ) : null}
    </>
  );
}
