import { type Column, type Row } from '../../core/model';
import { booleanOption, type Tool } from '../../core/registry';
import { normalizeKey } from '../../core/normalize';
import { ui } from '../../i18n';
import { format, plural } from '../../i18n/format';
import { freeColumnId, rowIdsAfter, rowsPhrase, withColumns } from '../helpers';

const strings = ui.tools.append;

const NORMALIZE = { trim: true, ignoreCase: true };

/**
 * Where each of the second list's columns lands in this one: the same id first, then the
 * same name, and otherwise a new column. Pasting a second batch of the same export
 * should just work; pasting something else should not silently lose a column.
 */
function mapColumns(
  input: { columns: Column[] },
  second: { columns: Column[] },
  byName: boolean,
): { map: Map<string, string>; added: Column[] } {
  const byId = new Map(input.columns.map((column) => [column.id, column.id]));
  const names = new Map(
    input.columns.map((column) => [normalizeKey(column.name, NORMALIZE), column.id]),
  );

  const map = new Map<string, string>();
  const added: Column[] = [];

  for (const column of second.columns) {
    const matched =
      byId.get(column.id) ??
      (byName ? names.get(normalizeKey(column.name, NORMALIZE)) : undefined);
    if (matched !== undefined) {
      map.set(column.id, matched);
      continue;
    }
    const id = freeColumnId({ columns: [...input.columns, ...added] }, column.id);
    added.push({ id, name: column.name });
    map.set(column.id, id);
  }

  return { map, added };
}

export const appendRowsTool: Tool = {
  id: 'append-rows',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['append', 'add', 'concat', 'combine', 'stack', 'more', 'paste'],
  arity: 'dual',
  options: [{ key: 'byName', label: strings.byName, type: 'boolean', default: true }],
  run(input, options, second) {
    if (second === undefined) {
      return {
        output: input,
        summary: ui.tools.nothingChanged,
        warnings: [ui.tools.shared.secondListMissing],
      };
    }
    if (second.rows.length === 0) {
      return { output: input, summary: ui.tools.nothingChanged };
    }

    const { map, added } = mapColumns(input, second, booleanOption(options, 'byName', true));
    const columns = [...input.columns, ...added];

    // Arriving rows get ids past the highest one here, so none repeats — even after
    // removals have left gaps in the numbering.
    const nextId = rowIdsAfter(input);
    const rows: Row[] = [
      ...input.rows,
      ...second.rows.map((row) => {
        const cells: Record<string, string> = {};
        for (const [from, to] of map) cells[to] = row.cells[from] ?? '';
        return { id: nextId(), cells };
      }),
    ];

    return {
      output: withColumns(input, columns, rows),
      summary: format(strings.summary, {
        added: plural(second.rows.length, strings.added),
        before: rowsPhrase(input.rows.length),
        after: rowsPhrase(rows.length),
      }),
      stats: { added: second.rows.length, columns: added.length },
      ...(added.length > 0
        ? { warnings: [format(strings.newColumns, { n: added.length })] }
        : {}),
    };
  },
};
