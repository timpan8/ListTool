import { ui } from '../i18n';
import { plural } from '../i18n/format';

interface Props {
  ticked: number;
  on: boolean;
  onChange: (on: boolean) => void;
}

/** Whether the tool runs on the ticked rows only. Shown only while some are ticked. */
export function ScopeToggle({ ticked, on, onChange }: Props) {
  return (
    <div class="field field--check scope">
      <label class="choice">
        <input
          type="checkbox"
          checked={on}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        {plural(ticked, ui.scope.only)}
      </label>
      <p class="field__help">{ui.scope.help}</p>
    </div>
  );
}
