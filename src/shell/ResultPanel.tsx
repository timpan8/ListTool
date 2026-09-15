import { useEffect, useState } from 'preact/hooks';
import { diffDatasets } from '../core/diff';
import type { Dataset } from '../core/model';
import type { Options, Tool } from '../core/registry';
import {
  addDataset,
  applyStep,
  noteToolUsed,
  openDatasets,
  selectedRows,
  setActive,
  setNotice,
  settings,
} from '../core/store';
import { en } from '../i18n/en';
import { format, plural } from '../i18n/format';
import { OptionsPanel } from './OptionsPanel';
import { startingOptions, withSelection } from './toolOptions';
import { ToolPreview } from './ToolPreview';

interface Props {
  dataset: Dataset;
  tool: Tool;
  /** Set when a checkup finding opened this tool: its own options win over the defaults. */
  initialOptions?: Options;
  onBack: () => void;
  onApplied: () => void;
}

/**
 * The one flow every tool follows: configure → live preview with its summary → Apply or
 * Apply to new list. There is no bespoke panel per tool; this is generated from the
 * tool's own option list.
 */
export function ResultPanel({ dataset, tool, initialOptions, onBack, onApplied }: Props) {
  const opening = (): Options => ({
    ...startingOptions(tool, settings.value),
    ...initialOptions,
  });
  const [options, setOptions] = useState<Options>(opening);
  const [secondId, setSecondId] = useState('');

  useEffect(() => {
    setOptions(opening());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, initialOptions]);

  // A dual tool needs a second list; anything but the one being worked on will do.
  const others = openDatasets.value.filter((candidate) => candidate.id !== dataset.id);
  const second =
    tool.arity === 'dual'
      ? (others.find((candidate) => candidate.id === secondId) ?? others[0])
      : undefined;

  const chosen = withSelection(tool.options, options, selectedRows.value);
  const result = tool.run(dataset, chosen, second);

  function apply(toNewList: boolean): void {
    const step = {
      toolId: tool.id,
      options: second === undefined ? chosen : { ...chosen, secondListId: second.id },
      summary: result.summary,
      at: Date.now(),
    };
    let landed = dataset.id;
    if (toNewList) {
      landed = addDataset(
        result.output,
        format(en.panel.copySuffix, { name: dataset.name, tool: tool.name }),
      );
    } else {
      applyStep(dataset.id, step, result.output);
    }

    // A tool that produced further lists opens them as tabs, and the result the person
    // was looking at stays in front — it is still where they were.
    const extras = result.extraLists ?? [];
    for (const extra of extras) addDataset(extra.dataset, extra.name);
    if (extras.length > 0) {
      setActive(landed);
      setNotice(plural(extras.length, en.panel.extraLists));
    }

    noteToolUsed(tool.id);
    onApplied();
  }

  return (
    <div
      class="result"
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          apply(false);
        }
      }}
    >
      <button type="button" class="button button--quiet result__back" onClick={onBack}>
        ← {en.panel.back}
      </button>

      <div>
        <h3 class="result__title">{tool.name}</h3>
        <p class="field__help">{tool.description}</p>
      </div>

      {tool.arity === 'dual' ? (
        <div class="field">
          <label class="field__label" for="tool-second">
            {en.tools.shared.secondList}
          </label>
          <select
            id="tool-second"
            value={second?.id ?? ''}
            onChange={(event) => setSecondId(event.currentTarget.value)}
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
      ) : null}

      <OptionsPanel
        idPrefix={`tool-${tool.id}`}
        fields={tool.options}
        options={chosen}
        columns={dataset.columns}
        secondColumns={second?.columns ?? []}
        onChange={(key, value) => setOptions({ ...options, [key]: value })}
      />

      <ToolPreview
        output={result.output}
        summary={result.summary}
        {...(result.warnings === undefined ? {} : { warnings: result.warnings })}
        diff={diffDatasets(dataset, result.output)}
      />

      <div class="result__actions">
        <button type="button" class="button" onClick={() => apply(true)}>
          {en.panel.applyToNew}
        </button>
        <button
          type="button"
          class="button button--primary"
          title={en.panel.applyHint}
          onClick={() => apply(false)}
        >
          {en.panel.apply}
        </button>
      </div>
    </div>
  );
}
