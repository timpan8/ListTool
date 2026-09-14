import {
  activeDataset,
  activeId,
  canRedoActive,
  canUndoActive,
  redo,
  setNotice,
  undo,
} from '../core/store';
import { DEFAULT_EXPORTER_ID, exporterById } from '../exporters';
import { defaultOptions } from '../core/registry';
import { en } from '../i18n/en';
import { copyText } from './clipboard';

interface Props {
  onImport: () => void;
  onTools: () => void;
  onExport: () => void;
}

/**
 * The primary toolbar. Individual tools never appear here — they live in the picker and
 * the palette, so this bar stays the same size however many tools exist.
 */
export function Toolbar({ onImport, onTools, onExport }: Props) {
  const dataset = activeDataset.value;
  const id = activeId.value;

  async function copy(): Promise<void> {
    if (dataset === null) return;
    const exporter = exporterById(DEFAULT_EXPORTER_ID);
    if (exporter === undefined) return;
    const text = exporter.render(dataset, defaultOptions(exporter.options));
    setNotice((await copyText(text)) ? en.toolbar.copied : en.toolbar.copyFailed);
  }

  return (
    <div class="toolbar" role="toolbar" aria-label={en.app.name}>
      <button type="button" class="button button--primary" onClick={onImport}>
        {en.toolbar.import}
      </button>
      {id === null ? null : (
        <>
          <button type="button" class="button" title={en.panel.toolsHint} onClick={onTools}>
            {en.toolbar.tools}
          </button>
          <button
            type="button"
            class="button"
            disabled={!canUndoActive.value}
            title={en.toolbar.undoHint}
            onClick={() => undo(id)}
          >
            {en.toolbar.undo}
          </button>
          <button
            type="button"
            class="button"
            disabled={!canRedoActive.value}
            title={en.toolbar.redoHint}
            onClick={() => redo(id)}
          >
            {en.toolbar.redo}
          </button>
          <span class="toolbar__gap" />
          <button type="button" class="button" onClick={() => void copy()}>
            {en.toolbar.copy}
          </button>
          <button type="button" class="button" onClick={onExport}>
            {en.toolbar.export}
          </button>
        </>
      )}
    </div>
  );
}
