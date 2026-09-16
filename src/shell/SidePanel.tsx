import { useEffect, useState } from 'preact/hooks';
import type { Dataset } from '../core/model';
import type { History } from '../core/history';
import type { Options, Tool } from '../core/registry';
import { ui } from '../i18n';
import { HistoryPanel } from './HistoryPanel';
import type { PanelIntent } from './panelIntent';
import { ProfilePanel } from './ProfilePanel';
import { ResultPanel } from './ResultPanel';
import { RecipesPanel } from './RecipesPanel';
import { ToolPicker } from './ToolPicker';

type Tab = 'tools' | 'columns' | 'history' | 'recipes';

interface Props {
  dataset: Dataset;
  history: History;
  /** Something asked the panel to open on a tool, a column's tools or a column's values. */
  intent: PanelIntent | null;
  onIntentHandled: () => void;
  onClose: () => void;
}

/** The collapsible right-hand panel: tools, this list's columns, its history, recipes. */
export function SidePanel({ dataset, history, intent, onIntentHandled, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('tools');
  const [tool, setTool] = useState<Tool | null>(null);
  // Options a finding or a menu handed over, so the tool opens on what was meant.
  const [opening, setOpening] = useState<Options | undefined>(undefined);
  // A column the picker is narrowed to, or the profile is scrolled to.
  const [columnId, setColumnId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (intent === null) return;
    if (intent.kind === 'tool') {
      setTab('tools');
      setTool(intent.tool);
      setOpening(intent.options);
    } else if (intent.kind === 'tools') {
      setTab('tools');
      setTool(null);
      setColumnId(undefined);
    } else if (intent.kind === 'column-tools') {
      setTab('tools');
      setTool(null);
      setColumnId(intent.columnId);
    } else {
      setTab('columns');
      setColumnId(intent.columnId);
    }
    onIntentHandled();
  }, [intent, onIntentHandled]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'tools', label: ui.panel.tools },
    { id: 'columns', label: ui.profile.title },
    { id: 'history', label: ui.panel.history },
    { id: 'recipes', label: ui.recipes.title },
  ];

  return (
    <aside class="side" aria-label={ui.panel.tools}>
      <div class="side__head">
        <div class="segmented" role="group" aria-label={ui.panel.tools}>
          {tabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              class="segmented__button"
              aria-pressed={tab === entry.id}
              onClick={() => setTab(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <button type="button" class="button button--quiet" onClick={onClose}>
          {ui.panel.close}
        </button>
      </div>

      <div class="side__body">
        {tab === 'recipes' ? (
          <RecipesPanel dataset={dataset} history={history} />
        ) : tab === 'columns' ? (
          <ProfilePanel
            dataset={dataset}
            {...(columnId === undefined ? {} : { focusColumn: columnId })}
          />
        ) : tab === 'history' ? (
          <HistoryPanel history={history} />
        ) : tool === null ? (
          <ToolPicker
            dataset={dataset}
            {...(columnId === undefined ? {} : { columnId })}
            onAllTools={() => setColumnId(undefined)}
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
