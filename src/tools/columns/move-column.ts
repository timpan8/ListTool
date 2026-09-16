import { stringOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format } from '../../i18n/format';
import { targetColumn, withColumns } from '../helpers';

const strings = ui.tools.moveColumn;

export const moveColumnTool: Tool = {
  id: 'move-column',
  name: strings.name,
  category: 'columns',
  description: strings.description,
  keywords: ['move', 'reorder', 'column', 'left', 'right', 'order'],
  arity: 'single',
  options: [
    { key: 'column', label: ui.tools.shared.column, type: 'column' },
    {
      key: 'direction',
      label: strings.direction,
      type: 'select',
      default: 'left',
      choices: [
        { value: 'left', label: strings.left },
        { value: 'right', label: strings.right },
      ],
    },
  ],
  appliesTo(input) {
    return input.columns.length >= 2;
  },
  run(input, options) {
    const target = targetColumn(input, options);
    if (target === undefined) return { output: input, summary: ui.tools.nothingChanged };

    const direction = stringOption(options, 'direction', 'left');
    const from = input.columns.indexOf(target);
    const to = direction === 'right' ? from + 1 : from - 1;

    if (to < 0 || to >= input.columns.length) {
      return { output: input, summary: ui.tools.nothingChanged, warnings: [strings.atEdge] };
    }

    const columns = [...input.columns];
    const [moved] = columns.splice(from, 1);
    if (moved !== undefined) columns.splice(to, 0, moved);

    return {
      output: withColumns(input, columns, input.rows),
      summary: format(strings.summary, {
        name: target.name,
        direction: direction === 'right' ? strings.right : strings.left,
      }),
    };
  },
};
