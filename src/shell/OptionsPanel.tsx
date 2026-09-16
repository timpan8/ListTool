import type { Column } from '../core/model';
import type { OptionField as Field, Options } from '../core/registry';
import { OptionField } from './OptionField';
import { labelFor, type ListNames } from './toolOptions';

interface Props {
  /** Prefix for input ids, so two panels on one page never collide. */
  idPrefix: string;
  fields: Field[];
  options: Options;
  /** Choices for a `column` or `columns` field — the input dataset's columns. */
  columns: Column[];
  /** The same for a field declaring `from: 'second'`. Empty when there is no second list. */
  secondColumns?: Column[];
  /** The lists' names, when there are two: column fields then say which they mean. */
  names?: ListNames;
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
  names,
  onChange,
}: Props) {
  if (fields.length === 0) return null;

  return (
    <div class="options">
      {fields.map((field) => (
        <OptionField
          key={field.key}
          id={`${idPrefix}-${field.key}`}
          field={field}
          label={labelFor(field, names)}
          value={options[field.key]}
          columns={
            (field.type === 'column' || field.type === 'columns') && field.from === 'second'
              ? secondColumns
              : columns
          }
          onChange={(value) => onChange(field.key, value)}
        />
      ))}
    </div>
  );
}
