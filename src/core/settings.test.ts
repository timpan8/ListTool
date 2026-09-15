import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  readSettings,
  settingsOptions,
  sortOptionsOf,
  withSettings,
} from './settings';

describe('sortOptionsOf', () => {
  it('turns the sort settings into the options the sort helpers take', () => {
    expect(sortOptionsOf({ ...DEFAULT_SETTINGS, sortLocale: 'en', naturalSort: false })).toEqual({
      locale: 'en',
      numeric: false,
    });
  });
});

describe('settings defaults', () => {
  it('sorts Swedish with natural number order', () => {
    expect(DEFAULT_SETTINGS.sortLocale).toBe('sv');
    expect(DEFAULT_SETTINGS.naturalSort).toBe(true);
  });

  it('reads names as Last First', () => {
    expect(DEFAULT_SETTINGS.defaultNameOrder).toBe('last-first');
  });

  it('keeps lists between sessions', () => {
    expect(DEFAULT_SETTINGS.keepLists).toBe(true);
  });
});

describe('withSettings', () => {
  it('overrides a matching option key', () => {
    const base = { locale: 'en', direction: 'asc' };
    const applied = withSettings(base, ['locale', 'direction'], {
      ...DEFAULT_SETTINGS,
      sortLocale: 'sv',
    });
    expect(applied).toEqual({ locale: 'sv', direction: 'asc' });
  });

  it('leaves a tool without that key alone', () => {
    expect(withSettings({ direction: 'asc' }, ['direction'], DEFAULT_SETTINGS)).toEqual({
      direction: 'asc',
    });
  });

  it('never invents a key the field list does not declare', () => {
    expect(withSettings({}, ['locale'], DEFAULT_SETTINGS)).toEqual({});
  });

  it('carries the name order to the recipients parser', () => {
    const applied = withSettings({ nameOrder: 'last-first' }, ['nameOrder'], {
      ...DEFAULT_SETTINGS,
      defaultNameOrder: 'first-last',
    });
    expect(applied['nameOrder']).toBe('first-last');
  });

  it('exposes every setting that maps to an option', () => {
    expect(Object.keys(settingsOptions(DEFAULT_SETTINGS)).sort()).toEqual([
      'delimiter',
      'locale',
      'nameOrder',
      'numeric',
    ]);
  });
});

describe('readSettings', () => {
  it('falls back for anything that is not an object', () => {
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(readSettings('nonsense')).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps the values it can use and defaults the rest', () => {
    expect(readSettings({ sortLocale: 'en', naturalSort: 'yes' })).toEqual({
      ...DEFAULT_SETTINGS,
      sortLocale: 'en',
    });
  });

  it('accepts the other name order', () => {
    expect(readSettings({ defaultNameOrder: 'first-last' }).defaultNameOrder).toBe('first-last');
  });

  it('rejects an unknown name order', () => {
    expect(readSettings({ defaultNameOrder: 'sideways' }).defaultNameOrder).toBe('last-first');
  });

  it('remembers the last export format, and lets the list decide when there is none', () => {
    expect(readSettings({ lastExporterId: 'csv' }).lastExporterId).toBe('csv');
    expect(readSettings({ lastExporterId: 7 }).lastExporterId).toBe('');
    expect(DEFAULT_SETTINGS.lastExporterId).toBe('');
  });
});
