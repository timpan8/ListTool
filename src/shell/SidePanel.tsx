import { useState } from 'preact/hooks';
import type { Dataset } from '../core/model';
import type { History } from '../core/history';
import type { Tool } from '../core/registry';
import { en } from '../i18n/en';
import { HistoryPanel } from './HistoryPanel';
import { ResultPanel } from './ResultPanel';
import { ToolPicker } from './ToolPicker';

interface Props {
  dataset: Dataset;
  history: History;
  onClose: () => void;
}

/** The collapsible right-hand panel: tools on one tab, this list's history on the other. */
export function SidePanel({ dataset, history, onClose }: Props) {
  const [tab, setTab] = useState<'tools' | 'history'>('tools');
  const [tool, setTool] = useState<Tool | null>(null);

  return (
    <aside class="side" aria-label={en.panel.tools}>
      <div class="side__head">
        <div class="segmented" role="group" aria-label={en.panel.tools}>
          <button
            type="button"
            class="segmented__button"
            aria-pressed={tab === 'tools'}
            onClick={() => setTab('tools')}
          >
            {en.panel.tools}
          </button>
          <button
            type="button"
            class="segmented__button"
            aria-pressed={tab === 'history'}
            onClick={() => setTab('history')}
          >
            {en.panel.history}
          </button>
        </div>
        <button type="button" class="button button--quiet" onClick={onClose}>
          {en.panel.close}
        </button>
      </div>

      <div class="side__body">
        {tab === 'history' ? (
          <HistoryPanel history={history} />
        ) : tool === null ? (
          <ToolPicker dataset={dataset} onPick={setTool} />
        ) : (
          <ResultPanel
            dataset={dataset}
            tool={tool}
            onBack={() => setTool(null)}
            onApplied={() => setTool(null)}
          />
        )}
      </div>
    </aside>
  );
}
