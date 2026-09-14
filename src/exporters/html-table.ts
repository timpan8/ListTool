import { cell, type Column, type Dataset } from '../core/model';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The same content as a real HTML table. Written onto the clipboard beside the plain
 * text, which is what makes a paste into Excel or Word land in cells instead of in one.
 */
export function renderHtmlTable(dataset: Dataset, columns: Column[], header: boolean): string {
  const lines = ['<table>'];
  if (header) {
    lines.push('  <thead>');
    lines.push(
      `    <tr>${columns.map((column) => `<th>${escapeHtml(column.name)}</th>`).join('')}</tr>`,
    );
    lines.push('  </thead>');
  }
  lines.push('  <tbody>');
  for (const row of dataset.rows) {
    lines.push(
      `    <tr>${columns
        .map((column) => `<td>${escapeHtml(cell(row, column.id))}</td>`)
        .join('')}</tr>`,
    );
  }
  lines.push('  </tbody>');
  lines.push('</table>');
  return lines.join('\n');
}
