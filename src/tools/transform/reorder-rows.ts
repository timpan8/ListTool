import type { Row } from '../../core/model';
import { numberOption, stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { rowsPhrase, withRows } from '../helpers';

const strings = en.tools.reorderRows;

/**
 * A small deterministic generator (mulberry32). Shuffling has to be reproducible: a
 * recipe that replays must give the same order, and a preview must match what Apply does.
 */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(rows: Row[], seed: number): Row[] {
  const next = random(seed);
  const out = [...rows];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1));
    const a = out[index] as Row;
    const b = out[swap] as Row;
    out[index] = b;
    out[swap] = a;
  }
  return out;
}

export const reorderRowsTool: Tool = {
  id: 'reorder-rows',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['reverse', 'shuffle', 'random', 'flip', 'order', 'mix'],
  arity: 'single',
  options: [
    {
      key: 'mode',
      label: strings.mode,
      type: 'select',
      default: 'reverse',
      choices: [
        { value: 'reverse', label: strings.reverse },
        { value: 'shuffle', label: strings.shuffle },
      ],
    },
    { key: 'seed', label: strings.seed, type: 'number', default: 1, help: strings.seedHelp },
  ],
  run(input, options) {
    const rows =
      stringOption(options, 'mode', 'reverse') === 'shuffle'
        ? shuffle(input.rows, Math.trunc(numberOption(options, 'seed', 1)))
        : [...input.rows].reverse();

    return {
      output: withRows(input, rows),
      summary: format(strings.summary, { rows: rowsPhrase(rows.length) }),
      stats: { rows: rows.length },
    };
  },
};
