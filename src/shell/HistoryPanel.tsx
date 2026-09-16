import { appliedSteps, type History } from '../core/history';
import { ui } from '../i18n';

interface Props {
  history: History;
}

/** The steps that led to what is on screen, each with the summary its tool reported. */
export function HistoryPanel({ history }: Props) {
  const steps = appliedSteps(history);

  return (
    <div class="history">
      <ol class="history__list">
        <li class="history__step">
          <span class="history__summary">{ui.panel.historyStart}</span>
        </li>
        {steps.map((step, index) => (
          <li key={`${step.at}-${index}`} class="history__step">
            <span class="history__summary">{step.summary}</span>
            {index === steps.length - 1 ? (
              <span class="history__current">{ui.panel.historyCurrent}</span>
            ) : null}
          </li>
        ))}
      </ol>
      {steps.length === 0 ? <p class="field__help">{ui.panel.historyEmpty}</p> : null}
    </div>
  );
}
