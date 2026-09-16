import type { Dataset } from '../core/model';
import { en } from '../i18n/en';

interface Props {
  /** Every open list but the one being worked on. */
  others: Dataset[];
  selected: Dataset | undefined;
  onChange: (id: string) => void;
}

/** A dual tool's second list: anything open but the one being worked on will do. */
export function SecondListPicker({ others, selected, onChange }: Props) {
  return (
    <div class="field">
      <label class="field__label" for="tool-second">
        {en.tools.shared.secondList}
      </label>
      <select
        id="tool-second"
        value={selected?.id ?? ''}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {others.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.name}
          </option>
        ))}
      </select>
      {others.length === 0 ? (
        <p class="field__help">{en.tools.shared.secondListMissing}</p>
      ) : null}
    </div>
  );
}
