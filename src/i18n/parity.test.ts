import { describe, expect, it } from 'vitest';
import { en } from './en';
import { language, translations, ui } from './index';
import { sv } from './sv';

type Node = string | { [key: string]: Node };

/** Every leaf of a string tree, as "path" → text. */
function leaves(node: Node, path = ''): Map<string, string> {
  const found = new Map<string, string>();
  if (typeof node === 'string') {
    found.set(path, node);
    return found;
  }
  for (const [key, child] of Object.entries(node)) {
    for (const [leafPath, text] of leaves(child, path === '' ? key : `${path}.${key}`)) {
      found.set(leafPath, text);
    }
  }
  return found;
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();
}

const EN = leaves(en as unknown as Node);
const SV = leaves(sv as unknown as Node);

describe('the two languages', () => {
  it('have exactly the same keys', () => {
    expect([...SV.keys()].sort()).toEqual([...EN.keys()].sort());
  });

  it('fill every string in Swedish too', () => {
    const blanks = [...SV].filter(([, text]) => text.trim() === '').map(([path]) => path);
    expect(blanks).toEqual([]);
  });

  it('keep the same placeholders in every string, so format() fills both alike', () => {
    const drifted: string[] = [];
    for (const [path, english] of EN) {
      const swedish = SV.get(path) ?? '';
      if (placeholders(english).join(',') !== placeholders(swedish).join(',')) drifted.push(path);
    }
    expect(drifted).toEqual([]);
  });

  it('give every plural its two forms on both sides', () => {
    for (const path of EN.keys()) {
      if (!path.endsWith('.one')) continue;
      const other = `${path.slice(0, -'.one'.length)}.other`;
      expect(EN.has(other), path).toBe(true);
      expect(SV.has(other), path).toBe(true);
    }
  });

  it('name every tool differently within each language', () => {
    for (const [code, strings] of Object.entries(translations)) {
      const names: string[] = [];
      for (const entry of Object.values(strings.tools as unknown as Record<string, Node>)) {
        if (typeof entry === 'object' && typeof entry['name'] === 'string') names.push(entry['name']);
      }
      expect(names.length, code).toBeGreaterThan(50);
      expect(new Set(names).size, code).toBe(names.length);
    }
  });

  it('are English by default, where nothing is stored', () => {
    expect(language).toBe('en');
    expect(ui).toBe(en);
    expect(translations.sv).toBe(sv);
  });

  it('call the languages by their own names on both sides', () => {
    expect(en.settings.languages).toEqual({ en: 'English', sv: 'Svenska' });
    expect(sv.settings.languages).toEqual({ en: 'English', sv: 'Svenska' });
  });
});
