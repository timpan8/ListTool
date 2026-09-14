import { en } from '../i18n/en';

interface Props {
  onImport: () => void;
}

/** The empty workspace teaches: it shows an example and what it turns into. */
export function EmptyState({ onImport }: Props) {
  return (
    <section class="empty">
      <h2 class="empty__title">{en.empty.title}</h2>
      <p class="empty__body">{en.empty.body}</p>
      <p class="empty__example">
        <span class="field__label">{en.empty.exampleLabel}</span>
        <code>{en.empty.example}</code>
        <span>{en.empty.exampleResult}</span>
      </p>
      <button type="button" class="button button--primary" onClick={onImport}>
        {en.empty.action}
      </button>
      <p class="field__help">{en.empty.pasteHint}</p>
    </section>
  );
}
