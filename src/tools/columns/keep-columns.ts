import { stringsOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format, plural } from '../../i18n/format';
import { withColumns } from '../helpers';

const strings = ui.tools.keepColumns;

export const keepColumnsTool: Tool = {
  id: 'keep-columns',
  name: strings.name,
  category: 'columns',
  description: strings.description,
  keywords: ['keep', 'select', 'choose', 'columns', 'remove', 'reorder', 'manage'],
  arity: 'single',
  options: [{ key: 'columns', label: strings.columns, type: 'columns' }],
  appliesTo(input) {
    return input.columns.length >= 2;
  },
  run(input, options) {
    const ids = stringsOption(options, 'columns', []);
    // No choice yet means every column, so the preview shows the list unchanged.
    const kept = ids.length === 0 ? input.columns : input.columns.filter((c) => ids.includes(c.id));

    if (kept.length === 0) {
      return { output: input, summary: ui.tools.nothingChanged, warnings: [strings.needOne] };
    }
    if (kept.length === input.columns.length) {
      return { output: input, summary: ui.tools.nothingChanged };
    }

    // Dropping a column drops its values too, rather than leaving them orphaned.
    const rows = input.rows.map((row) => ({
      id: row.id,
      cells: Object.fromEntries(kept.map((column) => [column.id, row.cells[column.id] ?? ''])),
    }));

    return {
      output: withColumns(input, kept, rows),
      summary: format(strings.summary, {
        kept: plural(kept.length, strings.columnCount),
        before: plural(input.columns.length, strings.columnCount),
      }),
      stats: { kept: kept.length, removed: input.columns.length - kept.length },
    };
  },
};
