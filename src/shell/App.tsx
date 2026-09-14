import { en } from '../i18n/en';

/** Placeholder shell. Replaced by the real workspace layout in milestone 2. */
export function App() {
  return (
    <main class="page">
      <header class="page__header">
        <h1 class="page__title">{en.app.name}</h1>
        <p class="page__tagline">{en.app.tagline}</p>
      </header>
      <section class="page__note">
        <h2>{en.placeholder.heading}</h2>
        <p>{en.placeholder.body}</p>
      </section>
      <p class="page__privacy">{en.app.privacy}</p>
    </main>
  );
}
