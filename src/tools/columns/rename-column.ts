import { stringOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format } from '../../i18n/format';
import { targetColumn, withColumns } from '../helpers';

const strings = ui.tools.renameColumn;

export const renameColumnTool: Tool = {
  id: 'rename-column',
  name: strings.name,
  category: 'columns',
  description: strings.description,
  keywords: ['rename', 'column', 'header', 'title', 'name'],
  arity: 'single',
  options: [
    { key: 'column', label: ui.tools.shared.column, type: 'column' },
    { key: 'name', label: strings.newName, type: 'text', default: '' },
  ],
  run(input, options) {
    const target = targetColumn(input, options);
    const name = stringOption(options, 'name', '').trim();
    if (target === undefined || name === '') {
      return { output: input, summary: ui.tools.nothingChanged, warnings: [strings.needName] };
    }

    // Only the name changes: the id is what recipes and tool options reference.
    const columns = input.columns.map((column) =>
      column.id === target.id ? { ...column, name } : column,
    );

    return {
      output: withColumns(input, columns, input.rows),
      summary: format(strings.summary, { old: target.name, name }),
    };
  },
};
