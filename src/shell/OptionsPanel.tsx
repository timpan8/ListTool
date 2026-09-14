import type { Column } from '../core/model';
import type { OptionField, Options } from '../core/registry';
import { DelimiterField } from './DelimiterField';

interface Props {
  /** Prefix for input ids, so two panels on one page never collide. */
  idPrefix: string;
  fields: OptionField[];
  options: Options;
  /** Choices for `column` fields — the input dataset's columns. */
  columns: Column[];
  onChange: (key: string, value: string | number | boolean) => void;
}

/**
 * The options form is GENERATED from a parser's, tool's or exporter's field list. It is
 * never hand-built, which is why adding one of those needs no shell change.
 */
export function OptionsPanel({ idPrefix, fields, options, columns, onChange }: Props) {
  if (fields.length === 0) return null;

  return (
    <div class="options">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const value = options[field.key];

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

        const choices =
          field.type === 'select'
            ? field.choices
            : field.type === 'column'
              ? columns.map((column) => ({ value: column.id, label: column.name }))
              : null;

        return (
          <div key={field.key} class="field">
            <label class="field__label" for={id}>
              {field.label}
            </label>
            {choices === null ? (
              <input
                id={id}
                type={field.type === 'number' ? 'number' : 'text'}
                value={value === undefined ? String(field.default) : String(value)}
                onInput={(event) =>
                  onChange(
                    field.key,
                    field.type === 'number'
                      ? Number(event.currentTarget.value)
                      : event.currentTarget.value,
                  )
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
