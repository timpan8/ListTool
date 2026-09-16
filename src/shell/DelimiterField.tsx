import { DELIMITER_PRESETS, escapeDelimiter, unescapeDelimiter } from '../core/detect';
import { ui } from '../i18n';

interface Props {
  id: string;
  label: string;
  value: string;
  help?: string;
  onChange: (value: string) => void;
}

const CUSTOM = 'custom';

function presetIdFor(value: string): string {
  return DELIMITER_PRESETS.find((preset) => preset.value === value)?.id ?? CUSTOM;
}

function labelFor(presetId: string): string {
  const labels: Record<string, string> = ui.options.delimiters;
  return labels[presetId] ?? presetId;
}

/** Presets plus a custom box, as SPEC §3 specifies. The value is the real delimiter. */
export function DelimiterField({ id, label, value, help, onChange }: Props) {
  const selected = presetIdFor(value);

  return (
    <fieldset class="field field--group">
      <legend class="field__label">{label}</legend>
      <div class="field__choices">
        {DELIMITER_PRESETS.map((preset) => (
          <label key={preset.id} class="choice">
            <input
              type="radio"
              name={id}
              checked={selected === preset.id}
              onChange={() => onChange(preset.value)}
            />
            {labelFor(preset.id)}
          </label>
        ))}
        <label class="choice">
          <input
            type="radio"
            name={id}
            checked={selected === CUSTOM}
            onChange={() => onChange(value === '' ? ',' : value)}
          />
          {ui.options.custom}
        </label>
      </div>
      {selected === CUSTOM ? (
        <label class="field__custom">
          <span class="field__label">{ui.options.customDelimiter}</span>
          <input
            type="text"
            value={escapeDelimiter(value)}
            onInput={(event) => onChange(unescapeDelimiter(event.currentTarget.value))}
          />
          <span class="field__help">{ui.options.customDelimiterHint}</span>
        </label>
      ) : null}
      {help === undefined ? null : <p class="field__help">{help}</p>}
    </fieldset>
  );
}
