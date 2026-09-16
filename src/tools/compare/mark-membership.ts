import { cell, type Row } from '../../core/model';
import { joinKeys, normalizeKey } from '../../core/normalize';
import { stringOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format } from '../../i18n/format';
import { freeColumnId, rowsPhrase, withColumns } from '../helpers';
import { KEY_FIELDS, NORMALIZE_FIELDS, readCompareOptions } from './shared';

const strings = ui.tools.markMembership;

export const markMembershipTool: Tool = {
  id: 'mark-membership',
  name: strings.name,
  category: 'compare',
  description: strings.description,
  keywords: ['mark', 'flag', 'membership', 'in list', 'three', 'several', 'exists', 'present'],
  arity: 'dual',
  options: [
    ...KEY_FIELDS,
    { key: 'columnName', label: strings.columnName, type: 'text', default: '' },
    { key: 'yes', label: strings.yes, type: 'text', default: 'yes' },
    { key: 'no', label: strings.no, type: 'text', default: '' },
    ...NORMALIZE_FIELDS,
  ],
  run(input, options, second) {
    if (second === undefined) {
      return {
        output: input,
        summary: ui.tools.nothingChanged,
        warnings: [ui.tools.shared.secondListMissing],
      };
    }

    const { keyA, keyB, normalize } = readCompareOptions(options, input, second);
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
