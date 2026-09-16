import type { Dataset } from '../core/model';
import type { History } from '../core/history';
import { en } from '../i18n/en';
import { CompareMode } from './CompareMode';
import { DatasetTabs } from './DatasetTabs';
import { DatasetView } from './DatasetView';
import { EmptyState } from './EmptyState';
import type { PanelIntent } from './panelIntent';
import { SidePanel } from './SidePanel';
import { StatusBar } from './StatusBar';
import { Toolbar } from './Toolbar';

interface Props {
  dataset: Dataset | null;
  history: History | null;
  panelOpen: boolean;
  comparing: boolean;
  intent: PanelIntent | null;
  onIntent: (intent: PanelIntent) => void;
  onIntentHandled: () => void;
  onImport: () => void;
  onReparse: () => void;
  onExport: () => void;
  onTools: () => void;
  onCompare: () => void;
  onCloseCompare: () => void;
  onClosePanel: () => void;
  onSettings: () => void;
}

/** The fixed chrome: header and tabs, toolbar, the active list, status bar. */
export function Layout({
  dataset,
  history,
  panelOpen,
  comparing,
  intent,
  onIntent,
  onIntentHandled,
  onImport,
  onReparse,
  onExport,
  onTools,
  onCompare,
  onCloseCompare,
  onClosePanel,
  onSettings,
}: Props) {
  return (
    <div class="app">
      <header class="app__header">
        <h1 class="app__name">{en.app.name}</h1>
        <DatasetTabs onAdd={onImport} />
        <button type="button" class="button button--quiet" onClick={onSettings}>
          {en.toolbar.settings}
        </button>
      </header>

      <Toolbar
        onImport={onImport}
        onTools={onTools}
        onCompare={onCompare}
        onExport={onExport}
      />

      <div class={panelOpen ? 'app__body has-panel' : 'app__body'}>
        <main id="content" class="app__main">
          {comparing ? (
            <CompareMode onImport={onImport} onClose={onCloseCompare} />
          ) : dataset === null ? (
            <EmptyState onImport={onImport} />
          ) : (
            <DatasetView dataset={dataset} onReparse={onReparse} onIntent={onIntent} />
          )}
        </main>
        {panelOpen && !comparing && dataset !== null && history !== null ? (
          <SidePanel
            dataset={dataset}
            history={history}
            intent={intent}
            onIntentHandled={onIntentHandled}
            onClose={onClosePanel}
          />
        ) : null}
      </div>

      <StatusBar />
    </div>
  );
}
