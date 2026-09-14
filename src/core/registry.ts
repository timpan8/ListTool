import type { Dataset } from './model';

export type Options = Record<string, unknown>;

export type OptionField =
  | {
      key: string;
      label: string;
      type: 'text' | 'number';
      default: string | number;
      help?: string;
    }
  | { key: string; label: string; type: 'boolean'; default: boolean; help?: string }
  | {
      key: string;
      label: string;
      type: 'select';
      default: string;
      choices: { value: string; label: string }[];
      help?: string;
    }
  /**
   * Dropdown of the input dataset's columns → column id. `allowAll` adds an
   * "All columns" choice whose value is '' — half the cleaning tools work either on one
   * column or on the whole row, and that choice belongs in the generated form rather
   * than in a second field or a special case in the shell.
   */
  | {
      key: string;
      label: string;
      type: 'column';
      default?: string;
      allowAll?: boolean;
      help?: string;
    }
  /**
   * Checkboxes over the input dataset's columns → an array of column ids. Omitting the
   * default means every column, which is what a table exporter wants before anyone has
   * touched it. Anything that works on a SET of columns — which columns a CSV writes,
   * which ones a list keeps — needs this; picking them one at a time is not the same
   * feature.
   */
  | {
      key: string;
      label: string;
      type: 'columns';
      default?: string[];
      help?: string;
    }
  /** Presets (newline , ; tab | space) + custom. */
  | { key: string; label: string; type: 'delimiter'; default: string; help?: string };

export interface ToolResult {
  output: Dataset;
  /** Human-readable, shown verbatim: "Removed 27 duplicates (815 → 788 rows)". */
  summary: string;
  stats?: Record<string, number>;
  warnings?: string[];
}

export interface Tool {
  /** kebab-case, never renamed: recipes reference it. */
  id: string;
  name: string;
  category: 'clean' | 'transform' | 'columns' | 'extract' | 'compare';
  description: string;
  keywords: string[];
  arity: 'single' | 'dual';
  /** The options panel is GENERATED from this — never hand-built. */
  options: OptionField[];
  appliesTo?(input: Dataset, second?: Dataset): boolean;
  run(input: Dataset, options: Options, second?: Dataset): ToolResult;
}

export interface Parser {
  id: string;
  name: string;
  description: string;
  options: OptionField[];
  /** Advisory only — the user can always override. */
  detect(input: string): { confidence: number; options: Options } | null;
  parse(input: string, options: Options): Dataset;
}

export interface Exporter {
  id: string;
  name: string;
  /** undefined = clipboard text only, no file download. */
  extension?: string;
  options: OptionField[];
  /** PURE — the shell does copy/download. */
  render(dataset: Dataset, options: Options): string;
}

/** The option record a field list describes when nothing has been changed yet. */
export function defaultOptions(fields: OptionField[]): Options {
  const options: Options = {};
  for (const field of fields) {
    // A column field with no default means "let the dataset decide", so it stays unset.
    if (field.type === 'column' || field.type === 'columns') {
      if (field.default !== undefined) options[field.key] = field.default;
    } else {
      options[field.key] = field.default;
    }
  }
  return options;
}

/**
 * The options worth keeping when the user switches to a different parser, tool or
 * exporter: those the new field list declares under the same key AND the same type.
 * Choosing "only the email column" and then switching CSV to Markdown is still about
 * the same columns; the format changed, not the intent.
 *
 * A `select` never carries — its choices belong to the field that declared them, so the
 * old value may not be one of the new ones.
 */
export function carryOptions(to: OptionField[], from: OptionField[], options: Options): Options {
  const carried: Options = {};
  for (const field of to) {
    if (field.type === 'select') continue;
    const before = from.find((candidate) => candidate.key === field.key);
    if (before?.type !== field.type) continue;
    if (field.key in options) carried[field.key] = options[field.key];
  }
  return carried;
}

/**
 * Options arrive as unknown values (they are serialized into recipes), so every read
 * narrows and falls back instead of asserting.
 */
export function stringOption(options: Options, key: string, fallback: string): string {
  const value = options[key];
  return typeof value === 'string' ? value : fallback;
}

export function booleanOption(options: Options, key: string, fallback: boolean): boolean {
  const value = options[key];
  return typeof value === 'boolean' ? value : fallback;
}

/** Read a `columns` option. Anything that is not an array of strings falls back. */
export function stringsOption(
  options: Options,
  key: string,
  fallback: string[],
): string[] {
  const value = options[key];
  if (!Array.isArray(value)) return fallback;
  return value.every((entry): entry is string => typeof entry === 'string') ? value : fallback;
}

export function numberOption(options: Options, key: string, fallback: number): number {
  const value = options[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}
