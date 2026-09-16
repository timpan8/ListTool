import { booleanOption, stringOption, type Tool } from '../../core/registry';
import { fillTemplate, placeholdersIn } from '../../core/template';
import { ui } from '../../i18n';
import { format } from '../../i18n/format';
import { freeColumnId, rowsPhrase, withColumns } from '../helpers';

const strings = ui.tools.templateColumn;

export const templateColumnTool: Tool = {
  id: 'template-column',
  name: strings.name,
  category: 'columns',
  description: strings.description,
  keywords: ['template', 'build', 'combine', 'format', 'pattern', 'concat', 'merge', 'compose'],
  arity: 'single',
  options: [
    { key: 'template', label: strings.template, type: 'text', default: '', help: strings.templateHelp },
    { key: 'columnName', label: strings.columnName, type: 'text', default: strings.defaultName },
    { key: 'unknown', label: strings.unknown, type: 'boolean', default: true },
  ],
  run(input, options) {
    const template = stringOption(options, 'template', '');
    if (template.trim() === '') {
      return { output: input, summary: ui.tools.nothingChanged, warnings: [strings.needTemplate] };
    }

    const keepUnknown = booleanOption(options, 'unknown', true);
    const name = stringOption(options, 'columnName', strings.defaultName).trim();
    const id = freeColumnId(input, 'built');

    const rows = input.rows.map((row) => ({
      id: row.id,
      cells: {
        ...row.cells,
        [id]: fillTemplate(template, row, input.columns, keepUnknown),
      },
    }));

    // A placeholder nothing is called is nearly always a typo, so it is named rather
    // than left to be discovered in the output.
    const known = new Set(input.columns.map((column) => column.id));
    const unknown = placeholdersIn(template).filter((key) => !known.has(key));

    return {
      output: withColumns(
        input,
        [...input.columns, { id, name: name === '' ? strings.defaultName : name }],
        rows,
      ),
      summary: format(strings.summary, {
        name: name === '' ? strings.defaultName : name,
        rows: rowsPhrase(rows.length),
      }),
      stats: { rows: rows.length, unknown: unknown.length },
      ...(unknown.length > 0
        ? { warnings: [format(strings.unknownFound, { keys: unknown.join(', ') })] }
        : {}),
    };
  },
};
