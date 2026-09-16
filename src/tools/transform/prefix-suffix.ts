import { stringOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format } from '../../i18n/format';
import { cellsPhrase, mapCells, targetColumns, withRows } from '../helpers';

const strings = ui.tools.affix;

export const prefixSuffixTool: Tool = {
  id: 'prefix-suffix',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['prefix', 'suffix', 'wrap', 'quote', 'surround', 'append'],
  arity: 'single',
  options: [
    { key: 'column', label: ui.tools.shared.column, type: 'column', default: '', allowAll: true },
    { key: 'prefix', label: strings.prefix, type: 'text', default: '' },
    { key: 'suffix', label: strings.suffix, type: 'text', default: '' },
  ],
  run(input, options) {
    const prefix = stringOption(options, 'prefix', '');
    const suffix = stringOption(options, 'suffix', '');

    if (prefix === '' && suffix === '') {
      return { output: input, summary: ui.tools.nothingChanged, warnings: [strings.nothing] };
    }

    // An empty cell stays empty: wrapping nothing in quotes is never what was meant.
    const { rows, changed } = mapCells(input, targetColumns(input, options), (value) =>
      value === '' ? value : `${prefix}${value}${suffix}`,
    );

    return {
      output: changed === 0 ? input : withRows(input, rows),
      summary:
        changed === 0
          ? ui.tools.nothingChanged
          : format(strings.summary, { cells: cellsPhrase(changed) }),
      stats: { changed },
    };
  },
};
