import { useEffect, useState } from 'preact/hooks';
import type { Dataset } from '../core/model';
import type { History } from '../core/history';
import type { Options, Tool } from '../core/registry';
import { en } from '../i18n/en';
import { HistoryPanel } from './HistoryPanel';
import { ProfilePanel } from './ProfilePanel';
import { ResultPanel } from './ResultPanel';
import { RecipesPanel } from './RecipesPanel';
import { ToolPicker } from './ToolPicker';

interface Props {
  dataset: Dataset;
  history: History;
  /** A tool chosen in the command palette, to open straight into. */
  pendingTool: Tool | null;
  onPendingHandled: () => void;
  onClose: () => void;
}

/** The collapsible right-hand panel: tools on one tab, this list's history on the other. */
export function SidePanel({ dataset, history, pendingTool, onPendingHandled, onClose }: Props) {
  const [tab, setTab] = useState<'tools' | 'columns' | 'history' | 'recipes'>('tools');
  const [tool, setTool] = useState<Tool | null>(null);
  // Options a finding handed over, so the tool opens on what was found.
  const [opening, setOpening] = useState<Options | undefined>(undefined);

  useEffect(() => {
    if (pendingTool === null) return;
    setTab('tools');
    setTool(pendingTool);
    setOpening(undefined);
    onPendingHandled();
  }, [pendingTool, onPendingHandled]);

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
            aria-pressed={tab === 'columns'}
            onClick={() => setTab('columns')}
          >
            {en.profile.title}
          </button>
          <button
            type="button"
            class="segmented__button"
            aria-pressed={tab === 'history'}
            onClick={() => setTab('history')}
          >
            {en.panel.history}
          </button>
          <button
            type="button"
            class="segmented__button"
            aria-pressed={tab === 'recipes'}
            onClick={() => setTab('recipes')}
          >
            {en.recipes.title}
          </button>
        </div>
        <button type="button" class="button button--quiet" onClick={onClose}>
          {en.panel.close}
        </button>
      </div>

      <div class="side__body">
        {tab === 'recipes' ? (
          <RecipesPanel dataset={dataset} history={history} />
        ) : tab === 'columns' ? (
          <ProfilePanel dataset={dataset} />
        ) : tab === 'history' ? (
          <HistoryPanel history={history} />
        ) : tool === null ? (
          <ToolPicker
            dataset={dataset}
            onPick={(picked, options) => {
              setTool(picked);
              setOpening(options);
            }}
          />
        ) : (
          <ResultPanel
            dataset={dataset}
            tool={tool}
            {...(opening === undefined ? {} : { initialOptions: opening })}
            onBack={() => setTool(null)}
            onApplied={() => setTool(null)}
          />
        )}
      </div>
    </aside>
  );
}
