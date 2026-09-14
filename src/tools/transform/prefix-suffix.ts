import { stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { cellsPhrase, mapCells, targetColumns, withRows } from '../helpers';

const strings = en.tools.affix;

export const prefixSuffixTool: Tool = {
  id: 'prefix-suffix',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['prefix', 'suffix', 'wrap', 'quote', 'surround', 'append'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column', default: '', allowAll: true },
    { key: 'prefix', label: strings.prefix, type: 'text', default: '' },
    { key: 'suffix', label: strings.suffix, type: 'text', default: '' },
  ],
  run(input, options) {
    const prefix = stringOption(options, 'prefix', '');
    const suffix = stringOption(options, 'suffix', '');

    if (prefix === '' && suffix === '') {
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.nothing] };
    }

    // An empty cell stays empty: wrapping nothing in quotes is never what was meant.
    const { rows, changed } = mapCells(input, targetColumns(input, options), (value) =>
      value === '' ? value : `${prefix}${value}${suffix}`,
    );

    return {
      output: withRows(input, rows),
      summary:
        changed === 0
          ? en.tools.nothingChanged
          : format(strings.summary, { cells: cellsPhrase(changed) }),
      stats: { changed },
    };
  },
};
