import { cell, makeRow, type Row } from '../../core/model';
import { normalizeKey } from '../../core/normalize';
import { stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { freshDataset, NORMALIZE_FIELDS, readNormalize, rowsPhrase, targetColumn } from '../helpers';
import { parseNumber } from '../../core/number';

const strings = en.tools.groupBy;

type How = 'count' | 'sum' | 'average' | 'min' | 'max' | 'join';

/** At most this many decimals in an average — enough to be exact, short enough to read. */
const DECIMALS = 6;

function short(value: number): string {
  return String(Number(value.toFixed(DECIMALS)));
}

interface Group {
  value: string;
  rows: Row[];
}

export const groupByTool: Tool = {
  id: 'group-by',
  name: strings.name,
  category: 'extract',
  description: strings.description,
  keywords: ['group', 'aggregate', 'summarise', 'summarize', 'sum', 'average', 'pivot', 'total'],
  arity: 'single',
  options: [
    { key: 'column', label: strings.groupColumn, type: 'column' },
    { key: 'valueColumn', label: strings.valueColumn, type: 'column' },
    {
      key: 'how',
      label: strings.how,
      type: 'select',
      default: 'count',
      choices: [
        { value: 'count', label: strings.count },
        { value: 'sum', label: strings.sum },
        { value: 'average', label: strings.average },
        { value: 'min', label: strings.min },
        { value: 'max', label: strings.max },
        { value: 'join', label: strings.join },
      ],
    },
    { key: 'separator', label: strings.separator, type: 'delimiter', default: ', ' },
    ...NORMALIZE_FIELDS,
  ],
  run(input, options) {
    const groupColumn = targetColumn(input, options);
    if (groupColumn === undefined) return { output: input, summary: en.tools.nothingChanged };

    const how = stringOption(options, 'how', 'count') as How;
    const valueColumn = targetColumn(input, options, 'valueColumn') ?? groupColumn;
    const separator = stringOption(options, 'separator', ', ');
    const normalize = readNormalize(options);

    // The first spelling seen names the group — normalization only decides what joins it.
    const groups = new Map<string, Group>();
    for (const row of input.rows) {
      const value = cell(row, groupColumn.id);
      const key = normalizeKey(value, normalize);
      const existing = groups.get(key);
      if (existing === undefined) groups.set(key, { value, rows: [row] });
      else existing.rows.push(row);
    }

    let notNumeric = 0;

    function summarise(rows: Row[]): string {
      const values = rows.map((row) => cell(row, valueColumn.id));
      if (how === 'count') return String(rows.length);
      if (how === 'join') return values.filter((value) => value !== '').join(separator);

      const numbers: number[] = [];
      for (const value of values) {
        if (value.trim() === '') continue;
        const parsed = parseNumber(value);
        if (parsed === null) notNumeric += 1;
        else numbers.push(parsed);
      }
      if (numbers.length === 0) return '';

      if (how === 'min') return short(Math.min(...numbers));
      if (how === 'max') return short(Math.max(...numbers));
      const total = numbers.reduce((sum, value) => sum + value, 0);
      return short(how === 'average' ? total / numbers.length : total);
    }

    const rows = [...groups.values()].map((group, index) =>
      makeRow(index, { group: group.value, result: summarise(group.rows) }),
    );

    return {
      output: freshDataset(
        input,
        [
          { id: 'group', name: groupColumn.name },
          { id: 'result', name: strings.columnNames[how] },
        ],
        rows,
      ),
      summary: format(strings.summary, {
        groups: plural(groups.size, strings.groups),
        rows: rowsPhrase(input.rows.length),
      }),
      stats: { groups: groups.size, notNumeric },
      ...(notNumeric > 0 ? { warnings: [plural(notNumeric, strings.notNumeric)] } : {}),
    };
  },
};
