import { useState } from 'preact/hooks';
import type { Dataset } from '../core/model';
import { carryOptions, defaultOptions, type Options } from '../core/registry';
import { sortOptionsOf } from '../core/settings';
import { activeView, setNotice, settings, updateSettings } from '../core/store';
import { copyScope, scopeRows, withVisible, type RowScope } from '../core/view';
import { copyExporter, exporterById, exporters, isTableExporter } from '../exporters';
import { en } from '../i18n/en';
import { format } from '../i18n/format';
import { Dialog } from './Dialog';
import { OptionsPanel } from './OptionsPanel';
import { RowScopeField } from './RowScopeField';
import { copyExported, copyNotice } from './copyOut';
import { downloadText, filenameFor } from './download';
import { withColumnDefaults } from './toolOptions';

const PREVIEW_LINES = 10;

interface Props {
  dataset: Dataset;
  onClose: () => void;
}

export function ExportDialog({ dataset, onClose }: Props) {
  const view = activeView.value;
  const prefs = settings.value;
  // The dialog opens on the format used last, or on the one the list's shape calls for.
  const opening = exporterById(prefs.lastExporterId) ?? copyExporter(dataset);
  const [exporterId, setExporterId] = useState(opening.id);
  const [options, setOptions] = useState<Options>(defaultOptions(opening.options));
  const [scope, setScope] = useState<RowScope>(copyScope(view));

  const exporter = exporterById(exporterId) ?? opening;
  const counts: Record<RowScope, number> = {
    shown: scopeRows(dataset, 'shown', view).length,
    ticked: view.ticked.length,
    all: dataset.rows.length,
  };
  // Rendered from the dataset narrowed to the chosen rows — never from the visible table.
  const scoped = withVisible(dataset, scopeRows(dataset, scope, view, sortOptionsOf(prefs)));
  const chosen = withColumnDefaults(
    exporter.options,
    { ...defaultOptions(exporter.options), ...options },
    scoped.columns,
  );
  const text = exporter.render(scoped, chosen);
  const previewLines = text.split('\n');
  const groups = [
    { label: en.export.groups.table, members: exporters.filter(isTableExporter) },
    { label: en.export.groups.other, members: exporters.filter((e) => !isTableExporter(e)) },
  ];

  function chooseExporter(id: string): void {
    const next = exporterById(id);
    if (next === undefined) return;
    setExporterId(id);
    setOptions({
      ...defaultOptions(next.options),
      ...carryOptions(next.options, exporter.options, options),
    });
  }

  function remember(): void {
    updateSettings({ lastExporterId: exporter.id });
  }

  async function copy(): Promise<void> {
    remember();
    const copied = await copyExported(exporter, scoped, chosen);
    setNotice(copyNotice(copied, scoped, scope, exporter));
    onClose();
  }

  function download(): void {
    remember();
    downloadText(filenameFor(dataset.name, exporter.extension ?? 'txt'), text);
  }

  return (
    <Dialog title={en.export.title} onClose={onClose}>
      <RowScopeField id="export-rows" value={scope} counts={counts} onChange={setScope} />

      <div class="field">
        <label class="field__label" for="export-format">
          {en.export.format}
        </label>
        <select
          id="export-format"
          value={exporter.id}
          onChange={(event) => chooseExporter(event.currentTarget.value)}
        >
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.members.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <OptionsPanel
        idPrefix="export"
        fields={exporter.options}
        options={chosen}
        columns={scoped.columns}
        onChange={(key, value) => setOptions({ ...options, [key]: value })}
      />

      <section class="preview">
        <h3 class="preview__title">{en.export.preview}</h3>
        {scoped.rows.length === 0 ? (
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
          <button type="button" class="button" onClick={download}>
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
