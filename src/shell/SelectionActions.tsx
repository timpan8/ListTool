import type { Dataset } from '../core/model';
import { selectRows, settings } from '../core/store';
import { en } from '../i18n/en';
import { plural } from '../i18n/format';
import type { PanelIntent } from './panelIntent';
import { selectionActions } from './selectionTools';

interface Props {
  dataset: Dataset;
  ticked: string[];
  onIntent: (intent: PanelIntent) => void;
}

/** What the ticked rows can have done to them, one click away, above the table. */
export function SelectionActions({ dataset, ticked, onIntent }: Props) {
  const actions = selectionActions(dataset, ticked, settings.value, onIntent);

  return (
    <p class="view__selection" role="status">
      <span>{plural(ticked.length, en.view.selection)}</span>
      {actions.map((action) => (
        <button key={action.id} type="button" class="button button--quiet" onClick={action.run}>
          {action.label}
        </button>
      ))}
      {/* Any tool at all: with rows ticked, the panel runs it on those rows only. */}
      <button
        type="button"
        class="button button--quiet"
        onClick={() => onIntent({ kind: 'tools' })}
      >
        {en.view.toolsForRows}
      </button>
      <button type="button" class="button button--quiet" onClick={() => selectRows([])}>
        {en.view.clearSelection}
      </button>
    </p>
  );
}
