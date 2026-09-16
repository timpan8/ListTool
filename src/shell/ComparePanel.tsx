import type { Dataset } from '../core/model';
import { ui } from '../i18n';

interface Props {
  /** Which side this is, for the control ids only: the heading is the list's own name. */
  idPrefix: string;
  datasets: Dataset[];
  selected: Dataset;
  onSelect: (id: string) => void;
  onPaste: () => void;
}

/** One side of the comparison: the list, called by its name. */
export function ComparePanel({ idPrefix, datasets, selected, onSelect, onPaste }: Props) {
  return (
    <section class="compare__panel" aria-label={selected.name}>
      <h3 class="compare__panel-title">{selected.name}</h3>

      <div class="field">
        <label class="field__label" for={`${idPrefix}-list`}>
          {ui.compare.pick}
        </label>
        <select
          id={`${idPrefix}-list`}
          value={selected.id}
          onChange={(event) => onSelect(event.currentTarget.value)}
        >
          {datasets.map((dataset) => (
            <option key={dataset.id} value={dataset.id}>
              {dataset.name}
            </option>
          ))}
        </select>
      </div>

      <button type="button" class="button button--quiet" onClick={onPaste}>
        {ui.compare.paste}
      </button>
    </section>
  );
}
