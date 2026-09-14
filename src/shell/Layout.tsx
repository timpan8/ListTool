import type { Dataset } from '../core/model';
import type { History } from '../core/history';
import { en } from '../i18n/en';
import { CompareMode } from './CompareMode';
import { DatasetTabs } from './DatasetTabs';
import { DatasetView } from './DatasetView';
import { EmptyState } from './EmptyState';
import { SidePanel } from './SidePanel';
import { StatusBar } from './StatusBar';
import { Toolbar } from './Toolbar';

interface Props {
  dataset: Dataset | null;
  history: History | null;
  panelOpen: boolean;
  comparing: boolean;
  onImport: () => void;
  onReparse: () => void;
  onExport: () => void;
  onTools: () => void;
  onCompare: () => void;
  onCloseCompare: () => void;
  onClosePanel: () => void;
}

/** The fixed chrome: header and tabs, toolbar, the active list, status bar. */
export function Layout({
  dataset,
  history,
  panelOpen,
  comparing,
  onImport,
  onReparse,
  onExport,
  onTools,
  onCompare,
  onCloseCompare,
  onClosePanel,
}: Props) {
  return (
    <div class="app">
      <header class="app__header">
        <h1 class="app__name">{en.app.name}</h1>
        <DatasetTabs onAdd={onImport} />
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
            <DatasetView dataset={dataset} onReparse={onReparse} />
          )}
        </main>
        {panelOpen && !comparing && dataset !== null && history !== null ? (
          <SidePanel dataset={dataset} history={history} onClose={onClosePanel} />
        ) : null}
      </div>

      <StatusBar />
    </div>
  );
}
