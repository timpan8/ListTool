import { defaultOptions, type OptionField, type Options, type Tool } from '../core/registry';
import { withSettings, type Settings } from '../core/settings';

/** A tool's own defaults, with the user's settings applied by option key. */
export function startingOptions(tool: Tool, settings: Settings): Options {
  return withSettings(
    defaultOptions(tool.options),
    tool.options.map((field) => field.key),
    settings,
  );
}

/**
 * A `rows` field is filled from the table's own ticks, because there is no way to pick
 * rows in a form. Driven by the field type, so a new tool that wants a selection gets it
 * without the shell ever learning that tool's name.
 */
export function withSelection(
  fields: OptionField[],
  options: Options,
  rows: string[],
): Options {
  const filled: Options = { ...options };
  for (const field of fields) {
    if (field.type === 'rows') filled[field.key] = rows;
  }
  return filled;
}
