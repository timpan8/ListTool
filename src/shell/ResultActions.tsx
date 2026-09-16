import { ui } from '../i18n';

interface Props {
  /** False when the result cannot replace the list — it can only become a new one. */
  canReplace: boolean;
  onApply: (toNewList: boolean) => void;
}

/** Apply to new list, and Apply — the latter only when the result can stand in for the list. */
export function ResultActions({ canReplace, onApply }: Props) {
  return (
    <>
      {canReplace ? null : (
        <p class="notice notice--warning" role="status">
          {ui.scope.notMergeable}
        </p>
      )}
      <div class="result__actions">
        <button type="button" class="button" onClick={() => onApply(true)}>
          {ui.panel.applyToNew}
        </button>
        {canReplace ? (
          <button
            type="button"
            class="button button--primary"
            title={ui.panel.applyHint}
            onClick={() => onApply(false)}
          >
            {ui.panel.apply}
          </button>
        ) : null}
      </div>
    </>
  );
}
