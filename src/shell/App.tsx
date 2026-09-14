import { useEffect, useState } from 'preact/hooks';
import {
  activeDataset,
  activeHistory,
  activeId,
  canRedoActive,
  canUndoActive,
  hydrate,
  redo,
  setNotice,
  startPersistence,
  undo,
} from '../core/store';
import { defaultOptions, type Tool } from '../core/registry';
import { exporterById, DEFAULT_EXPORTER_ID } from '../exporters';
import { htmlTableParser } from '../parsers/html-table';
import { en } from '../i18n/en';
import { CommandPalette } from './CommandPalette';
import { ExportDialog } from './ExportDialog';
import { ImportDialog } from './ImportDialog';
import { Layout } from './Layout';
import { Settings } from './Settings';
import { htmlFromPaste } from './clipboard';
import { copyExported } from './copyOut';

type DialogState =
  | { kind: 'none' }
  | { kind: 'import'; text: string; reparse: boolean; parserId?: string }
  | { kind: 'export' }
  | { kind: 'palette' }
  | { kind: 'settings' };

/** True when a paste carries a real table, and not just styled text. */
function hasTable(html: string): boolean {
  return html !== '' && htmlTableParser.detect(html) !== null;
}

/** True when the keystroke belongs to whatever the user is typing in. */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

// Restore the workspace before the first render, so a reload shows what was there.
hydrate();

export function App() {
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const [panelOpen, setPanelOpen] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [pendingTool, setPendingTool] = useState<Tool | null>(null);
  const dataset = activeDataset.value;
  const id = activeId.value;
  const open = dialog.kind !== 'none';

  useEffect(() => startPersistence(() => setNotice(en.settings.quota)), []);

  async function copyAs(exporterId: string): Promise<void> {
    const exporter = exporterById(exporterId);
    if (exporter === undefined || dataset === null) return;
    const copied = await copyExported(exporter, dataset, defaultOptions(exporter.options));
    setNotice(copied ? en.toolbar.copied : en.toolbar.copyFailed);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setDialog({ kind: 'none' });
        return;
      }
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();

      if (key === 'k') {
        event.preventDefault();
        setDialog({ kind: 'palette' });
        return;
      }
      // Copy the list only when the user has not selected text to copy themselves.
      if (key === 'c' && !isTyping(event.target)) {
        const selection = globalThis.getSelection();
        if (dataset === null || (selection !== null && !selection.isCollapsed)) return;
        event.preventDefault();
        void copyAs(DEFAULT_EXPORTER_ID);
        return;
      }
      if (key !== 'z' || id === null || open) return;
      event.preventDefault();
      if (event.shiftKey) {
        if (canRedoActive.value) redo(id);
      } else if (canUndoActive.value) {
        undo(id);
      }
    }

    // Ctrl/Cmd+V outside a field opens the import dialog with what was pasted. A copy
    // out of Excel or a web page carries the table as HTML beside the text, and the
    // table is the better of the two — detection picks the parser for it as usual.
    function onPaste(event: ClipboardEvent): void {
      if (open || isTyping(event.target)) return;
      const text = event.clipboardData?.getData('text') ?? '';
      const html = htmlFromPaste(event.clipboardData);
      const pasted = hasTable(html) ? html : text;
      if (pasted.trim() === '') return;
      event.preventDefault();
      setDialog({ kind: 'import', text: pasted, reparse: false });
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('paste', onPaste);
    };
  }, [id, open, dataset]);

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
        pendingTool={pendingTool}
        onPendingHandled={() => setPendingTool(null)}
        onTools={() => setPanelOpen(true)}
        onClosePanel={() => setPanelOpen(false)}
        onCompare={() => setComparing(true)}
        onCloseCompare={() => setComparing(false)}
        onSettings={() => setDialog({ kind: 'settings' })}
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
          forceParserId={dialog.parserId ?? null}
          onClose={() => setDialog({ kind: 'none' })}
        />
      ) : null}

      {dialog.kind === 'export' && dataset !== null ? (
        <ExportDialog dataset={dataset} onClose={() => setDialog({ kind: 'none' })} />
      ) : null}

      {dialog.kind === 'settings' ? (
        <Settings
          onClose={() => setDialog({ kind: 'none' })}
          onCleared={() => setNotice(en.settings.cleared)}
          onNotice={setNotice}
        />
      ) : null}

      {dialog.kind === 'palette' ? (
        <CommandPalette
          dataset={dataset}
          onClose={() => setDialog({ kind: 'none' })}
          pickTool={(tool) => {
            setComparing(false);
            setPanelOpen(true);
            setPendingTool(tool);
          }}
          reparse={(parserId) =>
            setDialog({
              kind: 'import',
              text: dataset?.rawInput ?? '',
              reparse: true,
              parserId,
            })
          }
          copyAs={(exporterId) => void copyAs(exporterId)}
        />
      ) : null}
    </>
  );
}
