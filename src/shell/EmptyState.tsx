import { ui } from '../i18n';

interface Props {
  onImport: () => void;
}

/** The empty workspace teaches: it shows an example and what it turns into. */
export function EmptyState({ onImport }: Props) {
  return (
    <section class="empty">
      <h2 class="empty__title">{ui.empty.title}</h2>
      <p class="empty__body">{ui.empty.body}</p>
      <p class="empty__example">
        <span class="field__label">{ui.empty.exampleLabel}</span>
        <code>{ui.empty.example}</code>
        <span>{ui.empty.exampleResult}</span>
      </p>
      <button type="button" class="button button--primary" onClick={onImport}>
        {ui.empty.action}
      </button>
      <p class="field__help">{ui.empty.pasteHint}</p>
    </section>
  );
}
