import { rowValues, type Dataset } from '../core/model';
import { booleanOption, stringOption, type Exporter } from '../core/registry';
import { en } from '../i18n/en';

/** A pipe would end the cell, so it is escaped; a newline becomes a break. */
function markdownCell(value: string): string {
  return value.split('|').join('\\|').replace(/\r?\n/g, '<br>');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarkdown(dataset: Dataset, header: boolean): string {
  const body = dataset.rows.map(
    (row) => `| ${rowValues(row, dataset.columns).map(markdownCell).join(' | ')} |`,
  );
  if (!header) return body.join('\n');

  const names = dataset.columns.map((column) => markdownCell(column.name));
  return [
    `| ${names.join(' | ')} |`,
    `| ${names.map(() => '---').join(' | ')} |`,
    ...body,
  ].join('\n');
}

function renderHtml(dataset: Dataset, header: boolean): string {
  const lines = ['<table>'];
  if (header) {
    lines.push('  <thead>');
    lines.push(
      `    <tr>${dataset.columns.map((column) => `<th>${escapeHtml(column.name)}</th>`).join('')}</tr>`,
    );
    lines.push('  </thead>');
  }
  lines.push('  <tbody>');
  for (const row of dataset.rows) {
    lines.push(
      `    <tr>${rowValues(row, dataset.columns)
        .map((value) => `<td>${escapeHtml(value)}</td>`)
        .join('')}</tr>`,
    );
  }
  lines.push('  </tbody>');
  lines.push('</table>');
  return lines.join('\n');
}

export const markdownExporter: Exporter = {
  id: 'markdown',
  name: en.exporters.markdown.name,
  extension: 'md',
  options: [
    {
      key: 'flavour',
      label: en.exporters.markdown.flavour,
      type: 'select',
      default: 'markdown',
      choices: [
        { value: 'markdown', label: en.exporters.markdown.markdown },
        { value: 'html', label: en.exporters.markdown.html },
      ],
    },
    { key: 'header', label: en.exporters.markdown.header, type: 'boolean', default: true },
  ],
  render(dataset, options) {
    const header = booleanOption(options, 'header', true);
    return stringOption(options, 'flavour', 'markdown') === 'html'
      ? renderHtml(dataset, header)
      : renderMarkdown(dataset, header);
  },
};
