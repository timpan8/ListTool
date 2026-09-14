import { useState } from 'preact/hooks';
import type { Dataset } from '../core/model';
import { carryOptions, defaultOptions, type Options } from '../core/registry';
import { setNotice } from '../core/store';
import { defaultExporter, exporterById, exporters } from '../exporters';
import { en } from '../i18n/en';
import { format } from '../i18n/format';
import { Dialog } from './Dialog';
import { OptionsPanel } from './OptionsPanel';
import { copyExported } from './copyOut';
import { downloadText, filenameFor } from './download';

const PREVIEW_LINES = 10;

interface Props {
  dataset: Dataset;
  onClose: () => void;
}

export function ExportDialog({ dataset, onClose }: Props) {
  const [exporterId, setExporterId] = useState(defaultExporter.id);
  const [options, setOptions] = useState<Options>(defaultOptions(defaultExporter.options));

  const exporter = exporterById(exporterId) ?? defaultExporter;
  // Rendered from the dataset, never from the visible table.
  const text = exporter.render(dataset, { ...defaultOptions(exporter.options), ...options });
  const previewLines = text.split('\n');

  function chooseExporter(id: string): void {
    const chosen = exporterById(id);
    if (chosen === undefined) return;
    setExporterId(id);
    setOptions({
      ...defaultOptions(chosen.options),
      ...carryOptions(chosen.options, exporter.options, options),
    });
  }

  async function copy(): Promise<void> {
    const copied = await copyExported(exporter, dataset, options);
    setNotice(copied ? en.toolbar.copied : en.toolbar.copyFailed);
    onClose();
  }

  return (
    <Dialog title={en.export.title} onClose={onClose}>
      <div class="field">
        <label class="field__label" for="export-format">
          {en.export.format}
        </label>
        <select
          id="export-format"
          value={exporter.id}
          onChange={(event) => chooseExporter(event.currentTarget.value)}
        >
          {exporters.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>
      </div>

      <OptionsPanel
        idPrefix="export"
        fields={exporter.options}
        options={options}
        columns={dataset.columns}
        onChange={(key, value) => setOptions({ ...options, [key]: value })}
      />

      <section class="preview">
        <h3 class="preview__title">{en.export.preview}</h3>
        {dataset.rows.length === 0 ? (
          <p class="field__help">{en.export.empty}</p>
        ) : (
          <>
            <p class="field__help">{format(en.export.previewNote, { n: PREVIEW_LINES })}</p>
            <pre class="preview__text">{previewLines.slice(0, PREVIEW_LINES).join('\n')}</pre>
          </>
        )}
      </section>

      <div class="dialog__actions">
        <button type="button" class="button" onClick={onClose}>
          {en.export.close}
        </button>
        {exporter.extension === undefined ? null : (
          <button
            type="button"
            class="button"
            onClick={() =>
              downloadText(filenameFor(dataset.name, exporter.extension ?? 'txt'), text)
            }
          >
            {en.export.download}
          </button>
        )}
        <button type="button" class="button button--primary" onClick={() => void copy()}>
          {en.export.copy}
        </button>
      </div>
    </Dialog>
  );
}
