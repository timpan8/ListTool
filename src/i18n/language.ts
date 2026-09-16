import { readLanguage, type Language } from '../core/settings';
import { load } from '../core/storage';

export type { Language };

/**
 * The language the stored settings ask for. It is read once, before anything renders,
 * from the same single key everything else lives under — never from a key of its own.
 */
export function storedLanguage(): Language {
  return readLanguage(load().settings.language);
}
