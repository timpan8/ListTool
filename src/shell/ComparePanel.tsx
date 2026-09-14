import type { Dataset } from '../core/model';
import { en } from '../i18n/en';

interface Props {
  label: string;
  idPrefix: string;
  datasets: Dataset[];
  selected: Dataset | null;
  keyColumn: string;
  onSelect: (id: string) => void;
  onKeyColumn: (id: string) => void;
  onPaste: () => void;
}

/** One side of the comparison: which list, and which column to match on. */
export function ComparePanel({
  label,
  idPrefix,
  datasets,
  selected,
  keyColumn,
  onSelect,
  onKeyColumn,
  onPaste,
}: Props) {
  return (
    <section class="compare__panel">
      <h3 class="compare__panel-title">{label}</h3>

      <div class="field">
        <label class="field__label" for={`${idPrefix}-list`}>
          {en.compare.pick}
        </label>
        <select
          id={`${idPrefix}-list`}
          value={selected?.id ?? ''}
          onChange={(event) => onSelect(event.currentTarget.value)}
        >
          {datasets.map((dataset) => (
            <option key={dataset.id} value={dataset.id}>
              {dataset.name}
            </option>
          ))}
        </select>
      </div>

      <div class="field">
        <label class="field__label" for={`${idPrefix}-key`}>
          {en.compare.keyColumn}
        </label>
        <select
          id={`${idPrefix}-key`}
          value={keyColumn}
          onChange={(event) => onKeyColumn(event.currentTarget.value)}
        >
          {(selected?.columns ?? []).map((column) => (
            <option key={column.id} value={column.id}>
              {column.name}
            </option>
          ))}
        </select>
      </div>

      <button type="button" class="button button--quiet" onClick={onPaste}>
        {en.compare.paste}
      </button>
    </section>
  );
}
