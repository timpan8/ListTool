import { compareDatasets, type CompareRow } from '../../core/compare';
import { valuesDataset, type Dataset, type Row } from '../../core/model';
import { stringOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format } from '../../i18n/format';
import { rowIdsAfter, rowsPhrase, withColumns } from '../helpers';
import { KEY_FIELDS, NORMALIZE_FIELDS, readCompareOptions } from './shared';

const strings = ui.tools.setOperation;

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
    ...KEY_FIELDS,
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
    const result = compareDatasets(input, second, { keyA, keyB, normalize });

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
          column?.name ?? ui.columns.value,
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
    // A's rows are still themselves; B's arrive with ids past A's, so none repeats.
    const nextId = rowIdsAfter(input);
    const rows = [
      ...picked.fromA,
      ...picked.fromB.map((row) => ({ id: nextId(), cells: row.cells })),
    ];

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
