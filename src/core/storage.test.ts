import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clear, EMPTY_PERSISTED, load, save, STORAGE_KEY } from './storage';
import { DEFAULT_SETTINGS } from './settings';
import { listOf } from '../test/fixtures';

class MemoryStorage {
  private data = new Map<string, string>();
  full = false;

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.full) throw new DOMException('full', 'QuotaExceededError');
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

let memory: MemoryStorage;

beforeEach(() => {
  memory = new MemoryStorage();
  vi.stubGlobal('localStorage', memory);
});

const state = {
  settings: DEFAULT_SETTINGS,
  favorites: ['sort'],
  recents: ['trim-whitespace'],
  datasets: [listOf('a', 'b')],
  recipes: [{ id: 'r1', name: 'Cleanup', steps: [], at: 0 }],
};

describe('storage', () => {
  it('round-trips everything it stores', () => {
    expect(save(state)).toBe('saved');
    const loaded = load();
    expect(loaded.favorites).toEqual(['sort']);
    expect(loaded.recents).toEqual(['trim-whitespace']);
    expect(loaded.datasets[0]?.rows).toHaveLength(2);
    expect(loaded.settings).toEqual(DEFAULT_SETTINGS);
    expect(loaded.recipes[0]?.name).toBe('Cleanup');
  });

  it('drops a stored recipe that is missing its shape', () => {
    memory.setItem(STORAGE_KEY, JSON.stringify({ recipes: [{ id: 'r' }, 'nope'] }));
    expect(load().recipes).toEqual([]);
  });

  it('uses one key', () => {
    save(state);
    expect(memory.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('reports nothing stored as an empty workspace', () => {
    expect(load()).toEqual(EMPTY_PERSISTED);
  });

  it('survives corrupt JSON rather than throwing', () => {
    memory.setItem(STORAGE_KEY, '{not json');
    expect(load()).toEqual(EMPTY_PERSISTED);
  });

  it('drops a stored list that is missing its shape', () => {
    memory.setItem(STORAGE_KEY, JSON.stringify({ datasets: [{ id: 'x' }, null, 'nope'] }));
    expect(load().datasets).toEqual([]);
  });

  it('drops favorites that are not strings', () => {
    memory.setItem(STORAGE_KEY, JSON.stringify({ favorites: ['sort', 7, null] }));
    expect(load().favorites).toEqual(['sort']);
  });

  it('reports a full quota instead of throwing', () => {
    memory.full = true;
    expect(save(state)).toBe('quota');
  });

  it('reports unavailable storage instead of throwing', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(save(state)).toBe('unavailable');
    expect(load()).toEqual(EMPTY_PERSISTED);
  });

  it('clears the key', () => {
    save(state);
    clear();
    expect(memory.getItem(STORAGE_KEY)).toBeNull();
    expect(load()).toEqual(EMPTY_PERSISTED);
  });

  it('clearing unavailable storage is harmless', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => clear()).not.toThrow();
  });
});
