import { useEffect, useRef, useState } from 'preact/hooks';
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
import { SecondListPicker } from './SecondListPicker';
import { startingOptions } from './toolOptions';
import { ToolPreview } from './ToolPreview';
import { finalOptions, useToolRun } from './useToolRun';

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
  // The newest options, before the render that shows them: Apply reads these, so a value
  // committed by the very click that applies is never a render behind.
  const latest = useRef(options);
  const [secondId, setSecondId] = useState('');

  useEffect(() => {
    latest.current = opening();
    setOptions(latest.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, initialOptions]);

  // A dual tool needs a second list; anything but the one being worked on will do.
  const others = openDatasets.value.filter((candidate) => candidate.id !== dataset.id);
  const second =
    tool.arity === 'dual'
      ? (others.find((candidate) => candidate.id === secondId) ?? others[0])
      : undefined;

  const ticked = selectedRows.value;
  const { chosen, result, diff } = useToolRun(tool, dataset, options, second, ticked);

  function change(key: string, value: unknown): void {
    latest.current = { ...latest.current, [key]: value };
    setOptions(latest.current);
  }

  function apply(toNewList: boolean): void {
    const fresh =
      latest.current === options
        ? { chosen, result }
        : (() => {
            const now = finalOptions(tool, latest.current, dataset, second, ticked);
            return { chosen: now, result: tool.run(dataset, now, second) };
          })();
    const step = {
      toolId: tool.id,
      options: second === undefined ? fresh.chosen : { ...fresh.chosen, secondListId: second.id },
      summary: fresh.result.summary,
      at: Date.now(),
    };
    let landed = dataset.id;
    if (toNewList) {
      landed = addDataset(
        fresh.result.output,
        format(en.panel.copySuffix, { name: dataset.name, tool: tool.name }),
      );
    } else {
      applyStep(dataset.id, step, fresh.result.output);
    }

    // A tool that produced further lists opens them as tabs, and the result the person
    // was looking at stays in front — it is still where they were.
    const extras = fresh.result.extraLists ?? [];
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
        <SecondListPicker others={others} selected={second} onChange={setSecondId} />
      ) : null}

      <OptionsPanel
        idPrefix={`tool-${tool.id}`}
        fields={tool.options}
        options={chosen}
        columns={dataset.columns}
        secondColumns={second?.columns ?? []}
        onChange={change}
      />

      <ToolPreview
        output={result.output}
        summary={result.summary}
        {...(result.warnings === undefined ? {} : { warnings: result.warnings })}
        diff={diff}
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
