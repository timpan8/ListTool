import { en } from './en';
import { storedLanguage, type Language } from './language';
import type { Strings } from './strings';
import { sv } from './sv';

export type { Language, Strings };

/** Every translation there is, by its code. */
export const translations: Record<Language, Strings> = { en, sv };

/**
 * The language of this page load. Chosen once, when the app starts, so every module can
 * read `ui` as a plain constant; changing it in Settings reloads the page.
 */
export const language: Language = storedLanguage();

/** Every user-facing string, in the language of this page load. */
export const ui: Strings = translations[language];
