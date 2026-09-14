import { useEffect, useState } from 'preact/hooks';
import {
  activeDataset,
  activeHistory,
  activeId,
  canRedoActive,
  canUndoActive,
  redo,
  undo,
} from '../core/store';
import { en } from '../i18n/en';
import { ExportDialog } from './ExportDialog';
import { ImportDialog } from './ImportDialog';
import { Layout } from './Layout';

type DialogState =
  | { kind: 'none' }
  | { kind: 'import'; text: string; reparse: boolean }
  | { kind: 'export' };

/** True when the keystroke belongs to whatever the user is typing in. */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

export function App() {
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const [panelOpen, setPanelOpen] = useState(false);
  const [comparing, setComparing] = useState(false);
  const dataset = activeDataset.value;
  const id = activeId.value;
  const open = dialog.kind !== 'none';

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setDialog({ kind: 'none' });
        return;
      }
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return;
      if (id === null || open) return;
      event.preventDefault();
      if (event.shiftKey) {
        if (canRedoActive.value) redo(id);
      } else if (canUndoActive.value) {
        undo(id);
      }
    }

    // Ctrl/Cmd+V on an empty workspace opens the import dialog with what was pasted.
    function onPaste(event: ClipboardEvent): void {
      if (open || isTyping(event.target)) return;
      const text = event.clipboardData?.getData('text') ?? '';
      if (text.trim() === '') return;
      event.preventDefault();
      setDialog({ kind: 'import', text, reparse: false });
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('paste', onPaste);
    };
  }, [id, open]);

  return (
    <>
      <a class="skip-link" href="#content">
        {en.a11y.skipToContent}
      </a>

      <Layout
        dataset={dataset}
        history={activeHistory.value}
        panelOpen={panelOpen}
        comparing={comparing}
        onTools={() => setPanelOpen(true)}
        onClosePanel={() => setPanelOpen(false)}
        onCompare={() => setComparing(true)}
        onCloseCompare={() => setComparing(false)}
        onImport={() => setDialog({ kind: 'import', text: '', reparse: false })}
        onReparse={() =>
          setDialog({ kind: 'import', text: dataset?.rawInput ?? '', reparse: true })
        }
        onExport={() => setDialog({ kind: 'export' })}
      />

      {dialog.kind === 'import' ? (
        <ImportDialog
          initialText={dialog.text}
          target={dialog.reparse ? dataset : null}
          onClose={() => setDialog({ kind: 'none' })}
        />
      ) : null}

      {dialog.kind === 'export' && dataset !== null ? (
        <ExportDialog dataset={dataset} onClose={() => setDialog({ kind: 'none' })} />
      ) : null}
    </>
  );
}
