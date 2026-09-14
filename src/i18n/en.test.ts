import { describe, expect, it } from 'vitest';
import { en } from './en';
import { format, plural } from './format';

type Node = string | { [key: string]: Node };

function walk(node: Node, path: string, visit: (value: string, path: string) => void): void {
  if (typeof node === 'string') {
    visit(node, path);
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    walk(child, path === '' ? key : `${path}.${key}`, visit);
  }
}

describe('en strings', () => {
  it('names the app', () => {
    expect(en.app.name).toBe('List Tool');
  });

  it('states the privacy promise in the wording the spec fixes', () => {
    expect(en.app.privacy).toBe('Your lists never leave your browser.');
  });

  it('has no blank strings anywhere in the tree', () => {
    const blanks: string[] = [];
    walk(en as unknown as Node, '', (value, path) => {
      if (value.trim() === '') blanks.push(path);
    });
    expect(blanks).toEqual([]);
  });

  it('holds strings only — no stray values a translator cannot translate', () => {
    const wrong: string[] = [];
    walk(en as unknown as Node, '', (value, path) => {
      if (typeof value !== 'string') wrong.push(path);
    });
    expect(wrong).toEqual([]);
  });
});

describe('format', () => {
  it('fills placeholders', () => {
    expect(format('{n} rows', { n: 3 })).toBe('3 rows');
    expect(format('{a} and {b}', { a: 'x', b: 'y' })).toBe('x and y');
  });

  it('leaves an unknown placeholder visible rather than printing undefined', () => {
    expect(format('{missing}', {})).toBe('{missing}');
  });

  it('fills a placeholder used twice', () => {
    expect(format('{n}/{n}', { n: 2 })).toBe('2/2');
  });
});

describe('plural', () => {
  it('picks the singular for exactly one', () => {
    expect(plural(1, en.status.rows)).toBe('1 row');
  });

  it('picks the plural for everything else', () => {
    expect(plural(0, en.status.rows)).toBe('0 rows');
    expect(plural(2, en.status.rows)).toBe('2 rows');
  });
});
