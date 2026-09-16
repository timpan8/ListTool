import { numberOption, stringOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format } from '../../i18n/format';
import { rowsPhrase, withRows } from '../helpers';
import { shuffle } from './reorder-rows';

const strings = ui.tools.sample;

const DEFAULT_COUNT = 20;
const DEFAULT_STEP = 10;

export const sampleTool: Tool = {
  id: 'sample',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['sample', 'first', 'last', 'top', 'head', 'tail', 'every', 'random', 'limit', 'try'],
  arity: 'single',
  options: [
    {
      key: 'mode',
      label: strings.mode,
      type: 'select',
      default: 'first',
      choices: [
        { value: 'first', label: strings.first },
        { value: 'last', label: strings.last },
        { value: 'every', label: strings.every },
        { value: 'random', label: strings.random },
      ],
    },
    { key: 'count', label: strings.count, type: 'number', default: DEFAULT_COUNT },
    { key: 'step', label: strings.step, type: 'number', default: DEFAULT_STEP },
    { key: 'seed', label: strings.seed, type: 'number', default: 1, help: strings.seedHelp },
  ],
  run(input, options) {
    const mode = stringOption(options, 'mode', 'first');
    const count = Math.max(1, Math.trunc(numberOption(options, 'count', DEFAULT_COUNT)));
    const step = Math.max(1, Math.trunc(numberOption(options, 'step', DEFAULT_STEP)));

    const kept =
      mode === 'last'
        ? input.rows.slice(-count)
        : mode === 'every'
          ? input.rows.filter((_, index) => index % step === 0)
          : mode === 'random'
            ? // Shuffled by seed, then put back in the list's own order: a sample is a
              // smaller version of the list, not a reordered one.
              (() => {
                const picked = new Set(
                  shuffle(input.rows, Math.trunc(numberOption(options, 'seed', 1)))
                    .slice(0, count)
                    .map((row) => row.id),
                );
                return input.rows.filter((row) => picked.has(row.id));
              })()
            : input.rows.slice(0, count);

    if (kept.length === input.rows.length) {
      return { output: input, summary: ui.tools.nothingChanged, warnings: [strings.alreadyShort] };
    }

    return {
      output: withRows(input, kept),
      summary: format(strings.summary, { kept: kept.length, before: rowsPhrase(input.rows.length) }),
      stats: { kept: kept.length, removed: input.rows.length - kept.length },
    };
  },
};
