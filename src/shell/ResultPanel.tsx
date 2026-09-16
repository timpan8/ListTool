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
import { ui } from '../i18n';
import { format, plural } from '../i18n/format';
import { OptionsPanel } from './OptionsPanel';
import { ResultActions } from './ResultActions';
import { ScopeToggle } from './ScopeToggle';
import { SecondListPicker } from './SecondListPicker';
import { startingOptions } from './toolOptions';
import { ToolPreview } from './ToolPreview';
import { finalOptions, runTool, useToolRun } from './useToolRun';

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
 * tool's own option list. With rows ticked, a tool that does not take the selection
 * itself runs on the ticked rows only, unless that is switched off.
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
  const [onTicked, setOnTicked] = useState(true);

  // The panel is reused when another tool is picked, so the options start over then —
  // and only then: the first render already has them, and an effect runs after paint,
  // late enough to undo a change made in the panel's first moments.
  const started = useRef(false);
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      return;
    }
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
  const canScope = ticked.length > 0 && !tool.options.some((field) => field.type === 'rows');
  const scope = canScope && onTicked ? ticked : null;
  const { chosen, result, diff } = useToolRun(tool, dataset, options, second, ticked, scope);
  const summaryOf = (summary: string): string =>
    scope === null ? summary : format(plural(scope.length, ui.scope.suffix), { summary });

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
            return { chosen: now, result: runTool(tool, dataset, now, second, scope) };
          })();
    const step = {
      toolId: tool.id,
      // The second list travels by id and by name, so a recipe can find it again.
      options:
        second === undefined
          ? fresh.chosen
          : { ...fresh.chosen, secondListId: second.id, secondListName: second.name },
      summary: summaryOf(fresh.result.summary),
      at: Date.now(),
      ...(scope === null ? {} : { scope: { rows: scope } }),
    };
    let landed = dataset.id;
    if (toNewList) {
      landed = addDataset(
        fresh.result.output,
        format(ui.panel.copySuffix, { name: dataset.name, tool: tool.name }),
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
      setNotice(plural(extras.length, ui.panel.extraLists));
    }

    noteToolUsed(tool.id);
    onApplied();
  }

  return (
    <div
      class="result"
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey && result.merged) {
          event.preventDefault();
          apply(false);
        }
      }}
    >
      <button type="button" class="button button--quiet result__back" onClick={onBack}>
        ← {ui.panel.back}
      </button>

      <div>
        <h3 class="result__title">{tool.name}</h3>
        <p class="field__help">{tool.description}</p>
      </div>

      {tool.arity === 'dual' ? (
        <SecondListPicker others={others} selected={second} onChange={setSecondId} />
      ) : null}

      {canScope ? <ScopeToggle ticked={ticked.length} on={onTicked} onChange={setOnTicked} /> : null}

      <OptionsPanel
        idPrefix={`tool-${tool.id}`}
        fields={tool.options}
        options={chosen}
        columns={dataset.columns}
        secondColumns={second?.columns ?? []}
        {...(tool.arity === 'dual'
          ? { names: { input: dataset.name, ...(second === undefined ? {} : { second: second.name }) } }
          : {})}
        onChange={change}
      />

      <ToolPreview
        output={result.output}
        summary={summaryOf(result.summary)}
        {...(result.warnings === undefined ? {} : { warnings: result.warnings })}
        diff={diff}
      />

      <ResultActions canReplace={result.merged} onApply={apply} />
    </div>
  );
}
