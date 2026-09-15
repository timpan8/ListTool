import type { RowScope } from '../core/view';
import { en } from '../i18n/en';
import { format } from '../i18n/format';

interface Props {
  id: string;
  value: RowScope;
  /** How many rows each scope would take. Ticked is offered only when some are. */
  counts: Record<RowScope, number>;
  onChange: (scope: RowScope) => void;
}

/** Which rows an export takes: the ones shown, the ticked ones, or the whole list. */
export function RowScopeField({ id, value, counts, onChange }: Props) {
  const scopes: RowScope[] = counts.ticked > 0 ? ['shown', 'ticked', 'all'] : ['shown', 'all'];

  return (
    <div class="field">
      <label class="field__label" for={id}>
        {en.export.rows}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as RowScope)}
      >
        {scopes.map((scope) => (
          <option key={scope} value={scope}>
            {format(en.export.scopes[scope], { n: counts[scope] })}
          </option>
        ))}
      </select>
      <p class="field__help">{en.export.scopeHelp[value]}</p>
    </div>
  );
}
