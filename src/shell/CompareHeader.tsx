import type { Dataset } from '../core/model';
import type { Options } from '../core/registry';
import { compareListsTool } from '../tools/compare/compare-lists';
import { ui } from '../i18n';
import { ComparePanel } from './ComparePanel';
import { OptionsPanel } from './OptionsPanel';

interface Props {
  a: Dataset;
  b: Dataset;
  datasets: Dataset[];
  /** The Compare tool's own options: what to match on, and how. */
  options: Options;
  onPick: (side: 'a' | 'b', id: string) => void;
  onSwap: () => void;
  onChange: (key: string, value: string | number | boolean | string[]) => void;
  onImport: () => void;
  onClose: () => void;
}

/**
 * The two lists, called by their names, and the Compare tool's form between them. The
 * form is generated from the tool's own declaration, so the mode and the tool can never
 * ask different questions.
 */
export function CompareHeader({
  a,
  b,
  datasets,
  options,
  onPick,
  onSwap,
  onChange,
  onImport,
  onClose,
}: Props) {
  return (
    <>
      <div class="compare__head">
        <h2 class="compare__title">{ui.compare.title}</h2>
        <button type="button" class="button button--quiet" onClick={onClose}>
          {ui.compare.close}
        </button>
      </div>

      <div class="compare__panels">
        <ComparePanel
          idPrefix="compare-a"
          datasets={datasets}
          selected={a}
          onSelect={(id) => onPick('a', id)}
          onPaste={onImport}
        />
        <button
          type="button"
          class="button compare__swap"
          title={ui.compare.swap}
          aria-label={ui.compare.swap}
          onClick={onSwap}
        >
          ⇄
        </button>
        <ComparePanel
          idPrefix="compare-b"
          datasets={datasets}
          selected={b}
          onSelect={(id) => onPick('b', id)}
          onPaste={onImport}
        />
      </div>

      <OptionsPanel
        idPrefix="compare"
        fields={compareListsTool.options}
        options={options}
        columns={a.columns}
        secondColumns={b.columns}
        names={{ input: a.name, second: b.name }}
        onChange={onChange}
      />
    </>
  );
}
