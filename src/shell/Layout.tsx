import type { Dataset } from '../core/model';
import { en } from '../i18n/en';
import { DatasetTabs } from './DatasetTabs';
import { DatasetView } from './DatasetView';
import { EmptyState } from './EmptyState';
import { StatusBar } from './StatusBar';
import { Toolbar } from './Toolbar';

interface Props {
  dataset: Dataset | null;
  onImport: () => void;
  onReparse: () => void;
  onExport: () => void;
}

/** The fixed chrome: header and tabs, toolbar, the active list, status bar. */
export function Layout({ dataset, onImport, onReparse, onExport }: Props) {
  return (
    <div class="app">
      <header class="app__header">
        <h1 class="app__name">{en.app.name}</h1>
        <DatasetTabs onAdd={onImport} />
      </header>

      <Toolbar onImport={onImport} onExport={onExport} />

      <main id="content" class="app__main">
        {dataset === null ? (
          <EmptyState onImport={onImport} />
        ) : (
          <DatasetView dataset={dataset} onReparse={onReparse} />
        )}
      </main>

      <StatusBar />
    </div>
  );
}
