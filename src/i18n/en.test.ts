import { describe, expect, it } from 'vitest';
import { en } from './en';

describe('en strings', () => {
  it('names the app', () => {
    expect(en.app.name).toBe('List Tool');
  });

  it('states the privacy promise in the wording the spec fixes', () => {
    expect(en.app.privacy).toBe('Your lists never leave your browser.');
  });

  it('has no empty strings', () => {
    const values = Object.values(en).flatMap((group) => Object.values(group));
    expect(values.length).toBeGreaterThan(0);
    for (const value of values) {
      expect(value.trim()).not.toBe('');
    }
  });
});
