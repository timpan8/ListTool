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
import { en } from '../i18n/en';
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
    <div class="toolbar" role="toolbar" aria-label={en.app.name}>
      <button type="button" class="button button--primary" onClick={onImport}>
        {en.toolbar.import}
      </button>
      {id === null ? null : (
        <>
          <button type="button" class="button" title={en.panel.toolsHint} onClick={onTools}>
            {en.toolbar.tools}
          </button>
          <button type="button" class="button" onClick={onCompare}>
            {en.compare.open}
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
          <button
            type="button"
            class="button"
            title={en.toolbar.copyHint}
            onClick={() => void copy()}
          >
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
