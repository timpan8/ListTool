import { booleanOption, numberOption, stringOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format } from '../../i18n/format';
import { cellsPhrase, mapCells, targetColumns, withRows } from '../helpers';

const strings = ui.tools.padTruncate;

/** Characters, not code units, so an emoji or an å counts as one. */
const chars = (value: string): string[] => [...value];

export const padTruncateTool: Tool = {
  id: 'pad-truncate',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['pad', 'truncate', 'cut', 'length', 'fixed', 'width', 'zero', 'leading'],
  arity: 'single',
  options: [
    { key: 'column', label: ui.tools.shared.column, type: 'column', default: '', allowAll: true },
    {
      key: 'mode',
      label: strings.mode,
      type: 'select',
      default: 'padStart',
      choices: [
        { value: 'padStart', label: strings.padStart },
        { value: 'padEnd', label: strings.padEnd },
        { value: 'truncate', label: strings.truncate },
      ],
    },
    { key: 'length', label: strings.length, type: 'number', default: 10 },
    { key: 'fill', label: strings.fill, type: 'text', default: '0' },
    { key: 'ellipsis', label: strings.ellipsis, type: 'boolean', default: false },
  ],
  run(input, options) {
    const mode = stringOption(options, 'mode', 'padStart');
    const length = Math.max(0, Math.trunc(numberOption(options, 'length', 10)));
    const fill = stringOption(options, 'fill', '0') || ' ';
    const ellipsis = booleanOption(options, 'ellipsis', false);

    const { rows, changed } = mapCells(input, targetColumns(input, options), (value) => {
      if (value === '') return value;
      const letters = chars(value);
      if (mode === 'truncate') {
        if (letters.length <= length) return value;
        if (!ellipsis || length === 0) return letters.slice(0, length).join('');
        return `${letters.slice(0, length - 1).join('')}…`;
      }
      if (letters.length >= length) return value;
      const padding = chars(fill.repeat(length)).slice(0, length - letters.length).join('');
      return mode === 'padEnd' ? `${value}${padding}` : `${padding}${value}`;
    });

    if (changed === 0) return { output: input, summary: ui.tools.nothingChanged };

    return {
      output: withRows(input, rows),
      summary: format(strings.summary, { cells: cellsPhrase(changed) }),
      stats: { changed },
    };
  },
};
