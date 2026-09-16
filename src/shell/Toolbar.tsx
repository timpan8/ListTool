import {
  activeDataset,
  activeId,
  activeView,
  canRedoActive,
  canUndoActive,
  redo,
  setNotice,
  settings,
  undo,
} from '../core/store';
import { ui } from '../i18n';
import { copyView } from './copyOut';

interface Props {
  onImport: () => void;
  onTools: () => void;
  onCompare: () => void;
  onExport: () => void;
}

/**
 * The primary toolbar. Individual tools never appear here — they live in the picker and
 * the palette, so this bar stays the same size however many tools exist.
 */
export function Toolbar({ onImport, onTools, onCompare, onExport }: Props) {
  const dataset = activeDataset.value;
  const id = activeId.value;

  // Copy takes what is on screen: the ticked rows if any, else the rows shown.
  async function copy(): Promise<void> {
    if (dataset === null) return;
    setNotice(await copyView(dataset, activeView.value, settings.value));
  }

  return (
    <div class="toolbar" role="toolbar" aria-label={ui.app.name}>
      <button type="button" class="button button--primary" onClick={onImport}>
        {ui.toolbar.import}
      </button>
      {id === null ? null : (
        <>
          <button type="button" class="button" title={ui.panel.toolsHint} onClick={onTools}>
            {ui.toolbar.tools}
          </button>
          <button type="button" class="button" onClick={onCompare}>
            {ui.compare.open}
          </button>
          <button
            type="button"
            class="button"
            disabled={!canUndoActive.value}
            title={ui.toolbar.undoHint}
            onClick={() => undo(id)}
          >
            {ui.toolbar.undo}
          </button>
          <button
            type="button"
            class="button"
            disabled={!canRedoActive.value}
            title={ui.toolbar.redoHint}
            onClick={() => redo(id)}
          >
            {ui.toolbar.redo}
          </button>
          <span class="toolbar__gap" />
          <button
            type="button"
            class="button"
            title={ui.toolbar.copyHint}
            onClick={() => void copy()}
          >
            {ui.toolbar.copy}
          </button>
          <button type="button" class="button" onClick={onExport}>
            {ui.toolbar.export}
          </button>
        </>
      )}
    </div>
  );
}
