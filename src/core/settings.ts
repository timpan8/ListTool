import type { Options } from './registry';
import { DEFAULT_LOCALE, type SortOptions } from './sort';

/** The languages the UI comes in. English is the default; Swedish is the one asked for. */
export type Language = 'en' | 'sv';

export const LANGUAGES: readonly Language[] = ['en', 'sv'];

export function readLanguage(value: unknown): Language {
  return value === 'sv' ? 'sv' : 'en';
}

export interface Settings {
  /** Pre-selected delimiter in the import dialog and in delimiter options. */
  defaultDelimiter: string;
  sortLocale: string;
  naturalSort: boolean;
  /** Recipients parser default — Outlook and Swedish convention put the surname first. */
  defaultNameOrder: 'last-first' | 'first-last';
  keepLists: boolean;
  /** The format the export dialog opens on: the one used last. '' = let the list decide. */
  lastExporterId: string;
  /** The language of the UI. Read once at start-up; changing it reloads the page. */
  language: Language;
}

export const DEFAULT_SETTINGS: Settings = {
  defaultDelimiter: ',',
  sortLocale: DEFAULT_LOCALE,
  naturalSort: true,
  defaultNameOrder: 'last-first',
  keepLists: true,
  lastExporterId: '',
  language: 'en',
};

/**
 * Settings reach parsers and tools by option key, not by naming any of them: a field
 * called `locale` gets the sort locale whichever tool declares it. That keeps a new
 * tool's options honouring the settings without anyone editing a mapping.
 */
export function settingsOptions(settings: Settings): Options {
  return {
    locale: settings.sortLocale,
    numeric: settings.naturalSort,
    nameOrder: settings.defaultNameOrder,
    delimiter: settings.defaultDelimiter,
  };
}

/** The sort rules the settings describe, for the view and for anything else that orders. */
export function sortOptionsOf(settings: Settings): SortOptions {
  return { locale: settings.sortLocale, numeric: settings.naturalSort };
}

/** Apply the settings to a field list's defaults, touching only keys that exist. */
export function withSettings(base: Options, fieldKeys: string[], settings: Settings): Options {
  const overrides = settingsOptions(settings);
  const applied: Options = { ...base };
  for (const key of fieldKeys) {
    if (key in overrides && key in base) applied[key] = overrides[key];
  }
  return applied;
}

/** Narrow an unknown value from storage into settings, field by field. */
export function readSettings(value: unknown): Settings {
  if (typeof value !== 'object' || value === null) return DEFAULT_SETTINGS;
  const raw = value as Record<string, unknown>;

  return {
    defaultDelimiter:
      typeof raw['defaultDelimiter'] === 'string'
        ? raw['defaultDelimiter']
        : DEFAULT_SETTINGS.defaultDelimiter,
    sortLocale:
      typeof raw['sortLocale'] === 'string' ? raw['sortLocale'] : DEFAULT_SETTINGS.sortLocale,
    naturalSort:
      typeof raw['naturalSort'] === 'boolean'
        ? raw['naturalSort']
        : DEFAULT_SETTINGS.naturalSort,
    defaultNameOrder:
      raw['defaultNameOrder'] === 'first-last' ? 'first-last' : DEFAULT_SETTINGS.defaultNameOrder,
    keepLists:
      typeof raw['keepLists'] === 'boolean' ? raw['keepLists'] : DEFAULT_SETTINGS.keepLists,
    lastExporterId:
      typeof raw['lastExporterId'] === 'string'
        ? raw['lastExporterId']
        : DEFAULT_SETTINGS.lastExporterId,
    language: readLanguage(raw['language']),
  };
}
