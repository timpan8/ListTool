import { columnId, draftDataset, makeRow, valuesDataset, type Column } from '../core/model';
import type { Parser } from '../core/registry';
import { ui } from '../i18n';
import { format } from '../i18n/format';

const strings = ui.parsers.json;

/** One cell's worth of text. A nested value is written as JSON rather than as [object]. */
function asText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsed(input: string): unknown[] | null {
  try {
    const value: unknown = JSON.parse(input);
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

export const jsonParser: Parser = {
  id: 'json',
  name: strings.name,
  description: strings.description,
  options: [],

  /** Claims an array, and only an array: an object is not a list of anything. */
  detect(input) {
    if (input.trim() === '' || !input.trimStart().startsWith('[')) return null;
    return parsed(input) === null ? null : { confidence: 0.95, options: {} };
  },

  parse(input, options) {
    const items = parsed(input) ?? [];
    const parse = { parserId: 'json', options };

    // An array of objects: the columns are the keys, in the order they first appear, so
    // a key only some objects carry still gets a column instead of being dropped.
    if (items.some(isRecord)) {
      const keys: string[] = [];
      for (const item of items) {
        if (!isRecord(item)) continue;
        for (const key of Object.keys(item)) if (!keys.includes(key)) keys.push(key);
      }
      const columns: Column[] = keys.map((key) => ({ id: key, name: key }));

      return draftDataset({
        columns,
        rows: items.map((item, index) =>
          makeRow(
            index,
            Object.fromEntries(
              keys.map((key) => [key, isRecord(item) ? asText(item[key]) : '']),
            ),
          ),
        ),
        rawInput: input,
        parse,
      });
    }

    // An array of arrays: a table with no headings of its own.
    if (items.some((item) => Array.isArray(item))) {
      const width = items.reduce<number>(
        (widest, item) => Math.max(widest, Array.isArray(item) ? item.length : 1),
        0,
      );
      const columns: Column[] = Array.from({ length: width }, (_, index) => ({
        id: columnId(index),
        name: format(ui.columns.numbered, { n: index + 1 }),
      }));

      return draftDataset({
        columns,
        rows: items.map((item, index) =>
          makeRow(
            index,
            Object.fromEntries(
              columns.map((column, at) => [
                column.id,
                Array.isArray(item) ? asText(item[at]) : at === 0 ? asText(item) : '',
              ]),
            ),
          ),
        ),
        rawInput: input,
        parse,
      });
    }

    // An array of plain values is a plain list.
    return valuesDataset(items.map(asText), ui.columns.value, input, parse);
  },
};
