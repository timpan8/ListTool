import type { Column } from '../core/model';

interface Props {
  label: string;
  columns: Column[];
  /** The chosen ids, or undefined for "every column" — untouched means all. */
  chosen: string[] | undefined;
  help?: string | undefined;
  onChange: (ids: string[]) => void;
}

/** A set of columns as checkboxes, kept in the dataset's own column order. */
export function ColumnsField({ label, columns, chosen, help, onChange }: Props) {
  const picked = chosen ?? columns.map((column) => column.id);

  return (
    <fieldset class="field field--group">
      <legend class="field__label">{label}</legend>
      <div class="field__choices">
        {columns.map((column) => (
          <label key={column.id} class="choice">
            <input
              type="checkbox"
              checked={picked.includes(column.id)}
              onChange={(event) =>
                onChange(
                  columns
                    .map((candidate) => candidate.id)
                    .filter((candidateId) =>
                      candidateId === column.id
                        ? event.currentTarget.checked
                        : picked.includes(candidateId),
                    ),
                )
              }
            />
            {column.name}
          </label>
        ))}
      </div>
      {help === undefined ? null : <p class="field__help">{help}</p>}
    </fieldset>
  );
}
