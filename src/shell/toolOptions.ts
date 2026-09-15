import type { Column } from '../core/model';
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

/** Whether a `column` field must name one real column (no "All" or "None" choice). */
function needsOneColumn(field: OptionField): boolean {
  return field.type === 'column' && field.allowAll !== true && field.allowNone !== true;
}

/**
 * Make the form say what will run. A `column` field that must name a column but does
 * not — nothing chosen yet, or a column that is no longer there — gets the next unused
 * real column, in field order, so two such fields never silently name the same one; a
 * `columns` field with a declared default gets the declared ids that exist. Everything
 * else is left as it is: "All columns", "None" and an untouched `columns` field with no
 * default all mean something on their own. Idempotent, so it can run on every render.
 */
export function withColumnDefaults(
  fields: OptionField[],
  options: Options,
  columns: Column[],
  secondColumns: Column[] = [],
): Options {
  const filled: Options = { ...options };
  const pools = { input: columns, second: secondColumns };
  const taken = { input: new Set<string>(), second: new Set<string>() };
  const cursor = { input: 0, second: 0 };

  const source = (field: OptionField): 'input' | 'second' =>
    (field.type === 'column' || field.type === 'columns') && field.from === 'second'
      ? 'second'
      : 'input';
  const exists = (pool: Column[], id: unknown): id is string =>
    typeof id === 'string' && pool.some((column) => column.id === id);

  // A column already chosen is spoken for, whichever field comes first.
  for (const field of fields) {
    if (needsOneColumn(field) && exists(pools[source(field)], options[field.key])) {
      taken[source(field)].add(options[field.key] as string);
    }
  }

  for (const field of fields) {
    const from = source(field);
    const pool = pools[from];
    if (pool.length === 0) continue;

    if (needsOneColumn(field)) {
      if (exists(pool, options[field.key])) continue;
      // The first column nobody has, starting where the last fill left off; when every
      // column is spoken for, go round again rather than leave the field empty.
      const start = cursor[from];
      let pick = pool[start % pool.length] as Column;
      for (let step = 0; step < pool.length; step += 1) {
        const candidate = pool[(start + step) % pool.length] as Column;
        if (!taken[from].has(candidate.id)) {
          pick = candidate;
          break;
        }
      }
      filled[field.key] = pick.id;
      taken[from].add(pick.id);
      cursor[from] = pool.indexOf(pick) + 1;
      continue;
    }

    if (field.type === 'columns' && field.default !== undefined) {
      const current = options[field.key];
      if (Array.isArray(current) && current.every((id) => exists(pool, id))) continue;
      const declared = field.default.filter((id) => exists(pool, id));
      filled[field.key] = declared.length > 0 ? declared : [(pool[0] as Column).id];
    }
  }

  return filled;
}
