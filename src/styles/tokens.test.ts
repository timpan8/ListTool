import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The palette is the one place a contrast regression can hide: a token nudged a shade
 * lighter breaks WCAG 2.2 AA everywhere at once and nothing else notices. This reads the
 * real stylesheet, so a change to it either keeps the guarantee or fails here.
 */
const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

function blockAfter(marker: string): string {
  const at = css.indexOf(marker);
  if (at === -1) throw new Error(`${marker} not found in tokens.css`);
  const open = css.indexOf('{', at);
  return css.slice(open, css.indexOf('}', open));
}

function tokens(block: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
    if (name !== undefined && value !== undefined) found[name] = value.trim();
  }
  return found;
}

const light = tokens(blockAfter(':root {'));
const dark = { ...light, ...tokens(blockAfter('@media (prefers-color-scheme: dark)')) };

function channel(value: number): number {
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const parts = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16) / 255);
  const [r, g, b] = parts.map(channel) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/** [foreground token, background token, minimum ratio]. 4.5 for text, 3 for a control edge. */
const PAIRS: [string, string, number][] = [
  ['--color-text', '--color-surface', 4.5],
  ['--color-text', '--color-surface-sunken', 4.5],
  ['--color-text-muted', '--color-surface', 4.5],
  ['--color-text-muted', '--color-surface-sunken', 4.5],
  ['--color-accent', '--color-surface', 4.5],
  ['--color-accent-text', '--color-accent', 4.5],
  ['--color-ok', '--color-surface', 4.5],
  ['--color-warning', '--color-surface', 4.5],
  ['--color-danger', '--color-surface', 4.5],
  ['--color-focus', '--color-surface', 3],
  ['--color-border-strong', '--color-surface', 3],
  ['--color-border-strong', '--color-surface-sunken', 3],
  // A marked row still has to be readable: the tint is never the only signal, but text
  // sitting on it must pass all the same.
  ['--color-text', '--color-surface-marked', 4.5],
  ['--color-text-muted', '--color-surface-marked', 4.5],
  ['--color-accent', '--color-surface-marked', 4.5],
  ['--color-border-strong', '--color-surface-marked', 3],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('the %s palette', (_name, palette) => {
  it('defines every colour token it needs', () => {
    for (const [foreground, background] of PAIRS) {
      expect(palette[foreground]).toMatch(/^#[0-9a-f]{6}$/i);
      expect(palette[background]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it.each(PAIRS)('%s on %s meets %s:1', (foreground, background, minimum) => {
    const ratio = contrast(palette[foreground] ?? '', palette[background] ?? '');
    expect(Number(ratio.toFixed(2))).toBeGreaterThanOrEqual(minimum);
  });
});

describe('tokens.css', () => {
  it('declares a colour scheme for each theme, so native controls follow', () => {
    expect(light['color-scheme'] ?? blockAfter(':root {')).toContain('light');
    expect(blockAfter('@media (prefers-color-scheme: dark)')).toContain('color-scheme: dark');
  });

  it('changes only colours between the themes — spacing and type are the design', () => {
    const changed = Object.keys(tokens(blockAfter('@media (prefers-color-scheme: dark)')));
    const nonColour = changed.filter((name) => name.startsWith('--') && !name.startsWith('--color-'));
    expect(nonColour).toEqual([]);
  });
});
