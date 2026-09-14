import { cell, type Column, type Row } from './model';

/** `{column id}` — the same placeholder shape the rest of the app uses. */
const PLACEHOLDER = /\{([\w.-]+)\}/g;

/**
 * Fill `{column}` placeholders from one row. Shared by the template exporter and the
 * template column tool, because "write this shape for every row" is one idea whether the
 * answer lands on the clipboard or in a column.
 *
 * An unknown placeholder is usually a typo, so by default it is left visible rather than
 * quietly turning into nothing.
 */
export function fillTemplate(
  template: string,
  row: Row,
  columns: Column[],
  keepUnknown = true,
): string {
  const known = new Set(columns.map((column) => column.id));
  return template.replace(PLACEHOLDER, (match, key: string) => {
    if (known.has(key)) return cell(row, key);
    return keepUnknown ? match : '';
  });
}

/** The placeholders a template names, in the order they appear, without repeats. */
export function placeholdersIn(template: string): string[] {
  const found: string[] = [];
  for (const [, key] of template.matchAll(PLACEHOLDER)) {
    if (key !== undefined && !found.includes(key)) found.push(key);
  }
  return found;
}
