import type { Column } from '../core/model';
import type { OptionField, Options } from '../core/registry';
import { en } from '../i18n/en';
import { plural } from '../i18n/format';
import { DebouncedInput } from './DebouncedInput';
import { DelimiterField } from './DelimiterField';

interface Props {
  /** Prefix for input ids, so two panels on one page never collide. */
  idPrefix: string;
  fields: OptionField[];
  options: Options;
  /** Choices for a `column` or `columns` field — the input dataset's columns. */
  columns: Column[];
  /** The same for a field declaring `from: 'second'`. Empty when there is no second list. */
  secondColumns?: Column[];
  onChange: (key: string, value: string | number | boolean | string[]) => void;
}

/**
 * The options form is GENERATED from a parser's, tool's or exporter's field list. It is
 * never hand-built, which is why adding one of those needs no shell change.
 */
export function OptionsPanel({
  idPrefix,
  fields,
  options,
  columns,
  secondColumns = [],
  onChange,
}: Props) {
  if (fields.length === 0) return null;

  return (
    <div class="options">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const value = options[field.key];
        const choosable =
          (field.type === 'column' || field.type === 'columns') && field.from === 'second'
            ? secondColumns
            : columns;

        if (field.type === 'delimiter') {
          return (
            <DelimiterField
              key={field.key}
              id={id}
              label={field.label}
              value={typeof value === 'string' ? value : field.default}
              {...(field.help === undefined ? {} : { help: field.help })}
              onChange={(next) => onChange(field.key, next)}
            />
          );
        }

        if (field.type === 'rows') {
          // Rows cannot be picked from a form, so this only reports what the table holds.
          const ticked = Array.isArray(value) ? value.length : 0;
          return (
            <div key={field.key} class="field">
              <span class="field__label">{field.label}</span>
              <p class="notice" role="status">
                {ticked === 0
                  ? en.options.selectionEmpty
                  : plural(ticked, en.options.selection)}
              </p>
              {field.help === undefined ? null : <p class="field__help">{field.help}</p>}
            </div>
          );
        }

        if (field.type === 'columns') {
          // No value at all means every column — a table exporter should write the whole
          // table before anyone has touched this.
          const chosen = Array.isArray(value)
            ? value.filter((entry): entry is string => typeof entry === 'string')
            : choosable.map((column) => column.id);

          return (
            <fieldset key={field.key} class="field field--group">
              <legend class="field__label">{field.label}</legend>
              <div class="field__choices">
                {choosable.map((column) => (
                  <label key={column.id} class="choice">
                    <input
                      type="checkbox"
                      checked={chosen.includes(column.id)}
                      onChange={(event) =>
                        onChange(
                          field.key,
                          // Kept in the dataset's own column order, not click order.
                          choosable
                            .map((candidate) => candidate.id)
                            .filter((candidateId) =>
                              candidateId === column.id
                                ? event.currentTarget.checked
                                : chosen.includes(candidateId),
                            ),
                        )
                      }
                    />
                    {column.name}
                  </label>
                ))}
              </div>
              {field.help === undefined ? null : <p class="field__help">{field.help}</p>}
            </fieldset>
          );
        }

        if (field.type === 'boolean') {
          return (
            <div key={field.key} class="field field--check">
              <label class="choice">
                <input
                  id={id}
                  type="checkbox"
                  checked={typeof value === 'boolean' ? value : field.default}
                  onChange={(event) => onChange(field.key, event.currentTarget.checked)}
                />
                {field.label}
              </label>
              {field.help === undefined ? null : <p class="field__help">{field.help}</p>}
            </div>
          );
        }

        const columnChoices = choosable.map((column) => ({
          value: column.id,
          label: column.name,
        }));

        const choices =
          field.type === 'select'
            ? field.choices
            : field.type === 'column'
              ? field.allowAll === true
                ? [{ value: '', label: en.options.allColumns }, ...columnChoices]
                : field.allowNone === true
                  ? [{ value: '', label: en.options.noColumns }, ...columnChoices]
                  : columnChoices
              : null;

        return (
          <div key={field.key} class="field">
            <label class="field__label" for={id}>
              {field.label}
            </label>
            {choices === null ? (
              <DebouncedInput
                id={id}
                type={field.type === 'number' ? 'number' : 'text'}
                value={value === undefined ? String(field.default) : String(value)}
                onChange={(typed) =>
                  onChange(field.key, field.type === 'number' ? Number(typed) : typed)
                }
              />
            ) : (
              <select
                id={id}
                value={typeof value === 'string' ? value : (choices[0]?.value ?? '')}
                onChange={(event) => onChange(field.key, event.currentTarget.value)}
              >
                {choices.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </select>
            )}
            {field.help === undefined ? null : <p class="field__help">{field.help}</p>}
          </div>
        );
      })}
    </div>
  );
}
