import { useEffect, useState } from 'preact/hooks';
import type { Dataset } from '../core/model';
import { defaultOptions, type Options, type Tool } from '../core/registry';
import { addDataset, applyStep } from '../core/store';
import { en } from '../i18n/en';
import { format } from '../i18n/format';
import { DataTable } from './DataTable';
import { OptionsPanel } from './OptionsPanel';

const PREVIEW_ROWS = 8;

interface Props {
  dataset: Dataset;
  tool: Tool;
  onBack: () => void;
  onApplied: () => void;
}

/**
 * The one flow every tool follows: configure → live preview with its summary → Apply or
 * Apply to new list. There is no bespoke panel per tool; this is generated from the
 * tool's own option list.
 */
export function ResultPanel({ dataset, tool, onBack, onApplied }: Props) {
  const [options, setOptions] = useState<Options>(defaultOptions(tool.options));

  useEffect(() => {
    setOptions(defaultOptions(tool.options));
  }, [tool]);

  const result = tool.run(dataset, options);

  function apply(toNewList: boolean): void {
    const step = { toolId: tool.id, options, summary: result.summary, at: Date.now() };
    if (toNewList) {
      addDataset(result.output, format(en.panel.copySuffix, { name: dataset.name, tool: tool.name }));
    } else {
      applyStep(dataset.id, step, result.output);
    }
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

      <OptionsPanel
        idPrefix={`tool-${tool.id}`}
        fields={tool.options}
        options={options}
        columns={dataset.columns}
        onChange={(key, value) => setOptions({ ...options, [key]: value })}
      />

      <p class="notice" role="status">
        {result.summary}
      </p>

      {(result.warnings ?? []).map((warning) => (
        <p key={warning} class="notice notice--warning" role="status">
          {warning}
        </p>
      ))}

      <section class="preview">
        <h4 class="preview__title">{en.panel.preview}</h4>
        {result.output.rows.length === 0 ? (
          <p class="field__help">{en.import.previewEmpty}</p>
        ) : (
          <>
            <p class="field__help">{format(en.panel.previewNote, { n: PREVIEW_ROWS })}</p>
            <DataTable
              columns={result.output.columns}
              rows={result.output.rows.slice(0, PREVIEW_ROWS)}
            />
          </>
        )}
      </section>

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
