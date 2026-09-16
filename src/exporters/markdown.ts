import { cell, type Column, type Dataset } from '../core/model';
import { booleanOption, stringOption, type Exporter } from '../core/registry';
import { renderHtmlTable } from './html-table';
import { chosenColumns } from './table-text';
import { ui } from '../i18n';

/** A pipe would end the cell, so it is escaped; a newline becomes a break. */
function markdownCell(value: string): string {
  return value.split('|').join('\\|').replace(/\r?\n/g, '<br>');
}

function renderMarkdown(dataset: Dataset, columns: Column[], header: boolean): string {
  const body = dataset.rows.map(
    (row) => `| ${columns.map((column) => markdownCell(cell(row, column.id))).join(' | ')} |`,
  );
  if (!header) return body.join('\n');

  const names = columns.map((column) => markdownCell(column.name));
  return [
    `| ${names.join(' | ')} |`,
    `| ${names.map(() => '---').join(' | ')} |`,
    ...body,
  ].join('\n');
}

export const markdownExporter: Exporter = {
  id: 'markdown',
  name: ui.exporters.markdown.name,
  extension: 'md',
  options: [
    { key: 'columns', label: ui.exporters.shared.columns, type: 'columns' },
    {
      key: 'flavour',
      label: ui.exporters.markdown.flavour,
      type: 'select',
      default: 'markdown',
      choices: [
        { value: 'markdown', label: ui.exporters.markdown.markdown },
        { value: 'html', label: ui.exporters.markdown.html },
      ],
    },
    { key: 'header', label: ui.exporters.markdown.header, type: 'boolean', default: true },
  ],
  render(dataset, options) {
    const header = booleanOption(options, 'header', true);
    const columns = chosenColumns(dataset, options);
    return stringOption(options, 'flavour', 'markdown') === 'html'
      ? renderHtmlTable(dataset, columns, header)
      : renderMarkdown(dataset, columns, header);
  },
  html(dataset, options) {
    return renderHtmlTable(
      dataset,
      chosenColumns(dataset, options),
      booleanOption(options, 'header', true),
    );
  },
};
