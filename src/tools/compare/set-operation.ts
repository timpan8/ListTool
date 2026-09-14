import { compareDatasets, type CompareRow } from '../../core/compare';
import { makeRow, valuesDataset, type Dataset, type Row } from '../../core/model';
import { booleanOption, stringOption, stringsOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { rowsPhrase, withColumns } from '../helpers';

const strings = en.tools.setOperation;

type Mode = 'intersection' | 'union' | 'a-minus-b' | 'b-minus-a' | 'symmetric';

interface Picked {
  fromA: Row[];
  fromB: Row[];
  keys: string[];
}

function pick(rows: CompareRow[], mode: Mode): Picked {
  const fromA: Row[] = [];
  const fromB: Row[] = [];
  const keys: string[] = [];

  for (const row of rows) {
    const inBoth = row.countA > 0 && row.countB > 0;
    const take =
      mode === 'intersection'
        ? inBoth
        : mode === 'union'
          ? true
          : mode === 'a-minus-b'
            ? row.status === 'only-a'
            : mode === 'b-minus-a'
              ? row.status === 'only-b'
              : !inBoth;
    if (!take) continue;

    keys.push(row.countA > 0 ? row.a : row.b);
    // One row per key: a set operation answers "which values", not "how many".
    if (row.countA > 0) fromA.push(row.rowsA[0] as Row);
    else fromB.push(row.rowsB[0] as Row);
  }

  return { fromA, fromB, keys };
}

function sameShape(a: Dataset, b: Dataset): boolean {
  const idsA = a.columns.map((column) => column.id).join('|');
  const idsB = b.columns.map((column) => column.id).join('|');
  return idsA === idsB;
}

export const setOperationTool: Tool = {
  id: 'set-operation',
  name: strings.name,
  category: 'compare',
  description: strings.description,
  keywords: ['set', 'intersection', 'union', 'difference', 'minus', 'both', 'except'],
  arity: 'dual',
  options: [
    { key: 'keyA', label: en.compare.listA, type: 'columns' },
    { key: 'keyB', label: en.compare.listB, type: 'columns' },
    {
      key: 'mode',
      label: strings.mode,
      type: 'select',
      default: 'intersection',
      choices: [
        { value: 'intersection', label: strings.intersection },
        { value: 'union', label: strings.union },
        { value: 'a-minus-b', label: strings.aMinusB },
        { value: 'b-minus-a', label: strings.bMinusA },
        { value: 'symmetric', label: strings.symmetric },
      ],
    },
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
    const result = compareDatasets(input, second, {
      keyA,
      keyB: stringsOption(options, 'keyB', [second.columns[0]?.id ?? '']),
      normalize: {
        trim: booleanOption(options, 'trim', true),
        ignoreCase: booleanOption(options, 'ignoreCase', true),
        ignoreDiacritics: booleanOption(options, 'ignoreDiacritics', false),
      },
    });

    const mode = stringOption(options, 'mode', 'intersection') as Mode;
    const picked = pick(result.rows, mode);
    const needsB = picked.fromB.length > 0;

    // Whole rows survive when both lists have the same shape. When they do not, keeping
    // A's columns would silently drop B's values, so the result is the matched values.
    if (needsB && !sameShape(input, second)) {
      const column = input.columns.find((candidate) => keyA.includes(candidate.id));
      return {
        output: valuesDataset(
          picked.keys,
          column?.name ?? en.columns.value,
          input.rawInput ?? '',
          input.parse ?? { parserId: 'lines', options: {} },
        ),
        summary: format(strings.summary, {
          rows: rowsPhrase(picked.keys.length),
          before: rowsPhrase(input.rows.length),
        }),
        stats: { rows: picked.keys.length },
        warnings: [strings.mixedShapes],
      };
    }

    // Same shape on both sides, so A's columns describe every row.
    const rows = [...picked.fromA, ...picked.fromB].map((row, index) =>
      makeRow(index, row.cells),
    );

    return {
      output: withColumns(input, input.columns, rows),
      summary: format(strings.summary, {
        rows: rowsPhrase(rows.length),
        before: rowsPhrase(input.rows.length),
      }),
      stats: { rows: rows.length },
    };
  },
};
