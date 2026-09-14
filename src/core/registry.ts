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
  /** Dropdown of the input dataset's columns → column id. */
  | { key: string; label: string; type: 'column'; default?: string; help?: string }
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
    if (field.type === 'column') {
      if (field.default !== undefined) options[field.key] = field.default;
    } else {
      options[field.key] = field.default;
    }
  }
  return options;
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

export function numberOption(options: Options, key: string, fallback: number): number {
  const value = options[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}
