import { cell, type Column, type Row } from '../../core/model';
import { joinKeys, normalizeKey } from '../../core/normalize';
import { booleanOption, stringOption, stringsOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { freeColumnId, rowIdsAfter, rowsPhrase, withColumns } from '../helpers';
import { KEY_FIELDS, NORMALIZE_FIELDS, readCompareOptions } from './shared';

const strings = en.tools.joinLists;

export const joinListsTool: Tool = {
  id: 'join-lists',
  name: strings.name,
  category: 'compare',
  description: strings.description,
  keywords: ['join', 'lookup', 'vlookup', 'merge', 'enrich', 'bring', 'second'],
  arity: 'dual',
  options: [
    ...KEY_FIELDS,
    { key: 'bring', label: strings.bring, type: 'columns', from: 'second' },
    { key: 'prefix', label: strings.prefix, type: 'text', default: '' },
    { key: 'keepUnmatched', label: strings.keepUnmatched, type: 'boolean', default: true },
    {
      key: 'firstMatch',
      label: strings.firstMatch,
      type: 'boolean',
      default: true,
      help: strings.firstMatchHelp,
    },
    ...NORMALIZE_FIELDS,
  ],
  run(input, options, second) {
    if (second === undefined) {
      return {
        output: input,
        summary: en.tools.nothingChanged,
        warnings: [en.tools.shared.secondListMissing],
      };
    }

    const { keyA, keyB, normalize } = readCompareOptions(options, input, second);
    const bringIds = stringsOption(
      options,
      'bring',
      second.columns.filter((column) => !keyB.includes(column.id)).map((column) => column.id),
    );
    const bring = second.columns.filter((column) => bringIds.includes(column.id));

    if (bring.length === 0) {
      return {
        output: input,
        summary: en.tools.nothingChanged,
        warnings: [strings.nothingToBring],
      };
    }

    const keyOf = (row: Row, ids: string[]): string =>
      joinKeys(ids.map((id) => normalizeKey(cell(row, id), normalize)));

    const lookup = new Map<string, Row[]>();
    for (const row of second.rows) {
      const key = keyOf(row, keyB);
      const existing = lookup.get(key);
      if (existing === undefined) lookup.set(key, [row]);
      else existing.push(row);
    }

    // The brought columns get their own ids, so a name both lists use cannot collide.
    const prefix = stringOption(options, 'prefix', '');
    const added: { column: Column; sourceId: string }[] = [];
    for (const column of bring) {
      const id = freeColumnId(
        { ...input, columns: [...input.columns, ...added.map((entry) => entry.column)] },
        column.id,
      );
      added.push({ column: { id, name: `${prefix}${column.name}` }, sourceId: column.id });
    }

    const keepUnmatched = booleanOption(options, 'keepUnmatched', true);
    const firstMatch = booleanOption(options, 'firstMatch', true);

    const rows: Row[] = [];
    const nextId = rowIdsAfter(input);
    let matched = 0;

    for (const row of input.rows) {
      const found = lookup.get(keyOf(row, keyA)) ?? [];
      if (found.length === 0) {
        // Unmatched rows keep empty cells rather than disappearing without a word.
        if (keepUnmatched) {
          const cells = { ...row.cells };
          for (const entry of added) cells[entry.column.id] = '';
          rows.push({ id: row.id, cells });
        }
        continue;
      }

      matched += 1;
      (firstMatch ? found.slice(0, 1) : found).forEach((match, at) => {
        const cells = { ...row.cells };
        for (const entry of added) cells[entry.column.id] = cell(match, entry.sourceId);
        // The first match is still this row; every further one is a new row.
        rows.push({ id: at === 0 ? row.id : nextId(), cells });
      });
    }

    const unmatched = input.rows.length - matched;

    return {
      output: withColumns(
        input,
        [...input.columns, ...added.map((entry) => entry.column)],
        rows,
      ),
      summary: format(strings.summary, {
        matched,
        rows: rowsPhrase(input.rows.length),
        columns: plural(added.length, strings.columnCount),
      }),
      stats: { matched, unmatched, rows: rows.length },
      ...(unmatched > 0 ? { warnings: [plural(unmatched, strings.unmatched)] } : {}),
    };
  },
};
