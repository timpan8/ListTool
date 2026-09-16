import { stringOption, stringsOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { rowsPhrase, withRows } from '../helpers';

const strings = en.tools.selectedRows;

export const selectedRowsTool: Tool = {
  id: 'selected-rows',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['selected', 'ticked', 'keep', 'remove', 'delete', 'rows', 'selection'],
  arity: 'single',
  options: [
    { key: 'rows', label: strings.rows, type: 'rows' },
    {
      key: 'mode',
      label: strings.mode,
      type: 'select',
      default: 'keep',
      choices: [
        { value: 'keep', label: strings.keep },
        { value: 'remove', label: strings.remove },
      ],
    },
  ],
  // Both answers are one click from the ticked rows themselves.
  presets: [
    { id: 'keep', label: strings.keep, options: { mode: 'keep' } },
    { id: 'remove', label: strings.remove, options: { mode: 'remove' } },
  ],
  run(input, options) {
    const chosen = new Set(stringsOption(options, 'rows', []));
    if (chosen.size === 0) {
      return { output: input, summary: en.tools.nothingChanged };
    }

    const keep = stringOption(options, 'mode', 'keep') === 'keep';
    const rows = input.rows.filter((row) => chosen.has(row.id) === keep);

    if (rows.length === input.rows.length) {
      return { output: input, summary: en.tools.nothingChanged };
    }
    if (rows.length === 0) {
      // Emptying a list is never what a tick meant, so it is refused rather than done.
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.keepNothing] };
    }

    return {
      output: withRows(input, rows),
      summary: keep
        ? format(strings.summary, { kept: rows.length, before: rowsPhrase(input.rows.length) })
        : format(strings.removedSummary, {
            removed: input.rows.length - rows.length,
            before: rowsPhrase(input.rows.length),
          }),
      stats: { kept: rows.length, removed: input.rows.length - rows.length },
    };
  },
};
