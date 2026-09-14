import { cell, type Row } from '../../core/model';
import { joinKeys, normalizeKey } from '../../core/normalize';
import { booleanOption, stringOption, stringsOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { freeColumnId, rowsPhrase, withColumns } from '../helpers';

const strings = en.tools.markMembership;

export const markMembershipTool: Tool = {
  id: 'mark-membership',
  name: strings.name,
  category: 'compare',
  description: strings.description,
  keywords: ['mark', 'flag', 'membership', 'in list', 'three', 'several', 'exists', 'present'],
  arity: 'dual',
  options: [
    { key: 'keyA', label: en.compare.listA, type: 'columns' },
    { key: 'keyB', label: en.compare.listB, type: 'columns', from: 'second' },
    { key: 'columnName', label: strings.columnName, type: 'text', default: '' },
    { key: 'yes', label: strings.yes, type: 'text', default: 'yes' },
    { key: 'no', label: strings.no, type: 'text', default: '' },
    { key: 'trim', label: en.tools.shared.trim, type: 'boolean', default: true },
    { key: 'ignoreCase', label: en.tools.shared.ignoreCase, type: 'boolean', default: true },
    {
      key: 'ignoreDiacritics',
      label: en.tools.shared.ignoreDiacritics,
      type: 'boolean',
      default: false,
      help: en.tools.shared.diacriticsHelp,
    },
  ],
  run(input, options, second) {
    if (second === undefined) {
      return {
        output: input,
        summary: en.tools.nothingChanged,
        warnings: [en.tools.shared.secondListMissing],
      };
    }

    const keyA = stringsOption(options, 'keyA', [input.columns[0]?.id ?? '']);
    const keyB = stringsOption(options, 'keyB', [second.columns[0]?.id ?? '']);
    const normalize = {
      trim: booleanOption(options, 'trim', true),
      ignoreCase: booleanOption(options, 'ignoreCase', true),
      ignoreDiacritics: booleanOption(options, 'ignoreDiacritics', false),
    };
    const keyOf = (row: Row, ids: string[]): string =>
      joinKeys(ids.map((id) => normalizeKey(cell(row, id), normalize)));

    const inSecond = new Set(second.rows.map((row) => keyOf(row, keyB)));
    const yes = stringOption(options, 'yes', 'yes');
    const no = stringOption(options, 'no', '');

    // Named after the second list by default, which is what makes running it once per
    // list produce a readable three-way table rather than three columns called "In list".
    const name = stringOption(options, 'columnName', '') || second.name;
    const id = freeColumnId(input, 'in');
    const column = { id, name };

    let found = 0;
    const rows = input.rows.map((row) => {
      const present = inSecond.has(keyOf(row, keyA));
      if (present) found += 1;
      return { id: row.id, cells: { ...row.cells, [id]: present ? yes : no } };
    });

    return {
      output: withColumns(input, [...input.columns, column], rows),
      summary: format(strings.summary, {
        found,
        rows: rowsPhrase(input.rows.length),
        name,
      }),
      stats: { found, missing: input.rows.length - found },
    };
  },
};
