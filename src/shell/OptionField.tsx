import type { Column } from '../core/model';
import type { OptionField as Field } from '../core/registry';
import { en } from '../i18n/en';
import { plural } from '../i18n/format';
import { ColumnsField } from './ColumnsField';
import { DebouncedInput } from './DebouncedInput';
import { DelimiterField } from './DelimiterField';

interface Props {
  id: string;
  field: Field;
  label: string;
  value: unknown;
  /** The columns a column field may name: the input list's, or the second list's. */
  columns: Column[];
  onChange: (value: string | number | boolean | string[]) => void;
}

/** One generated form control, chosen by the field's declared type. */
export function OptionField({ id, field, label, value, columns, onChange }: Props) {
  const help = field.help === undefined ? null : <p class="field__help">{field.help}</p>;

  if (field.type === 'delimiter') {
    return (
      <DelimiterField
        id={id}
        label={label}
        value={typeof value === 'string' ? value : field.default}
        {...(field.help === undefined ? {} : { help: field.help })}
        onChange={onChange}
      />
    );
  }

  if (field.type === 'rows') {
    // Rows cannot be picked from a form, so this only reports what the table holds.
    const ticked = Array.isArray(value) ? value.length : 0;
    return (
      <div class="field">
        <span class="field__label">{label}</span>
        <p class="notice" role="status">
          {ticked === 0 ? en.options.selectionEmpty : plural(ticked, en.options.selection)}
        </p>
        {help}
      </div>
    );
  }

  if (field.type === 'columns') {
    const chosen = Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === 'string')
      : undefined;
    return (
      <ColumnsField
        label={label}
        columns={columns}
        chosen={chosen}
        help={field.help}
        onChange={onChange}
      />
    );
  }

  if (field.type === 'boolean') {
    return (
      <div class="field field--check">
        <label class="choice">
          <input
            id={id}
            type="checkbox"
            checked={typeof value === 'boolean' ? value : field.default}
            onChange={(event) => onChange(event.currentTarget.checked)}
          />
          {label}
        </label>
        {help}
      </div>
    );
  }

  const choices =
    field.type === 'select'
      ? field.choices
      : field.type === 'column'
        ? [
            ...(field.allowAll === true
              ? [{ value: '', label: en.options.allColumns }]
              : field.allowNone === true
                ? [{ value: '', label: en.options.noColumns }]
                : []),
            ...columns.map((column) => ({ value: column.id, label: column.name })),
          ]
        : null;

  return (
    <div class="field">
      <label class="field__label" for={id}>
        {label}
      </label>
      {choices === null ? (
        <DebouncedInput
          id={id}
          type={field.type === 'number' ? 'number' : 'text'}
          value={value === undefined ? String(field.default) : String(value)}
          onChange={(typed) => onChange(field.type === 'number' ? Number(typed) : typed)}
        />
      ) : (
        <select
          id={id}
          value={typeof value === 'string' ? value : (choices[0]?.value ?? '')}
          onChange={(event) => onChange(event.currentTarget.value)}
        >
          {choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      )}
      {help}
    </div>
  );
}
