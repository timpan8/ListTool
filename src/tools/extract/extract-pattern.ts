import { cell, type Column, type Row } from '../../core/model';
import { booleanOption, stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { freeColumnId, safeRegExp, targetColumn, withColumns } from '../helpers';

const strings = en.tools.extract;

const PRESETS: Record<string, { source: string; columnName: string; capture?: number }> = {
  email: {
    source: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}',
    columnName: en.columns.email,
  },
  domain: {
    source: '[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})',
    columnName: en.columns.domain,
    capture: 1,
  },
  url: {
    source: 'https?://[^\\s<>"\'\\]]+',
    columnName: en.columns.url,
  },
  ipv4: {
    source: '\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b',
    columnName: en.columns.ipv4,
  },
  ipv6: {
    // Hex groups joined by at least two colons, so a clock time is not an address.
    source: '(?:[0-9A-Fa-f]{1,4})?(?::(?:[0-9A-Fa-f]{1,4})?){2,7}',
    columnName: en.columns.ipv6,
  },
  guid: {
    source: '\\b[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\\b',
    columnName: en.columns.guid,
  },
  number: {
    source: '-?\\d+(?:[.,]\\d+)?',
    columnName: en.columns.number,
  },
};

/**
 * The capture groups of a pattern, in order: a name for a named group, null for a plain
 * one. Non-capturing groups, lookarounds, escaped brackets and character classes are
 * passed over. Approximate by design — a regex parser is not what this needs.
 */
export function captureGroupNames(source: string): (string | null)[] {
  const names: (string | null)[] = [];
  let inClass = false;
  for (let at = 0; at < source.length; at += 1) {
    const char = source[at];
    if (char === '\\') {
      at += 1;
      continue;
    }
    if (inClass) {
      if (char === ']') inClass = false;
      continue;
    }
    if (char === '[') {
      inClass = true;
      continue;
    }
    if (char !== '(') continue;
    if (source[at + 1] !== '?') {
      names.push(null);
      continue;
    }
    const named = /^\(\?<([A-Za-z_][A-Za-z0-9_]*)>/.exec(source.slice(at));
    if (named !== null) names.push(named[1] as string);
  }
  return names;
}

export const extractPatternTool: Tool = {
  id: 'extract-pattern',
  name: strings.name,
  category: 'extract',
  description: strings.description,
  keywords: ['extract', 'email', 'domain', 'regex', 'pattern', 'pull', 'find'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column' },
    {
      key: 'preset',
      label: strings.preset,
      type: 'select',
      default: 'email',
      choices: [
        { value: 'email', label: strings.presetEmail },
        { value: 'domain', label: strings.presetDomain },
        { value: 'url', label: strings.presetUrl },
        { value: 'ipv4', label: strings.presetIpv4 },
        { value: 'ipv6', label: strings.presetIpv6 },
        { value: 'guid', label: strings.presetGuid },
        { value: 'number', label: strings.presetNumber },
        { value: 'regex', label: strings.presetRegex },
      ],
    },
    { key: 'regex', label: strings.regex, type: 'text', default: '' },
    {
      key: 'allMatches',
      label: strings.allMatches,
      type: 'boolean',
      default: false,
      help: strings.allMatchesHelp,
    },
    {
      key: 'groups',
      label: strings.groups,
      type: 'boolean',
      default: false,
      help: strings.groupsHelp,
    },
  ],
  run(input, options) {
    const source = targetColumn(input, options);
    if (source === undefined) return { output: input, summary: en.tools.nothingChanged };

    const presetId = stringOption(options, 'preset', 'email');
    const preset = PRESETS[presetId];
    const patternSource = preset?.source ?? stringOption(options, 'regex', '');
    const capture = preset?.capture ?? 0;

    if (patternSource === '') {
      return { output: input, summary: en.tools.nothingChanged };
    }
    const pattern = safeRegExp(patternSource, 'gu');
    if (pattern === null) {
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.badRegex] };
    }

    const all = booleanOption(options, 'allMatches', false);
    const groupNames = booleanOption(options, 'groups', false) ? captureGroupNames(patternSource) : [];

    // Each capture group into its own column, from the first match; without groups, or
    // with a pattern that has none, the whole match (or the preset's group) as before.
    if (groupNames.length > 0) {
      let taken = input;
      const targets: Column[] = groupNames.map((name, index) => {
        const column: Column = {
          id: freeColumnId(taken, name ?? `match${index + 1}`),
          name: name ?? format(en.columns.part, { name: en.columns.match, n: index + 1 }),
        };
        taken = { ...taken, columns: [...taken.columns, column] };
        return column;
      });
      let found = 0;
      const rows: Row[] = input.rows.map((row) => {
        const match = pattern.exec(cell(row, source.id));
        pattern.lastIndex = 0;
        if (match !== null) found += 1;
        const cells = { ...row.cells };
        targets.forEach((column, index) => {
          cells[column.id] = match?.[index + 1] ?? '';
        });
        return { id: row.id, cells };
      });
      return {
        output: withColumns(input, [...input.columns, ...targets], rows),
        summary: format(strings.summary, {
          found: plural(found, strings.found),
          column: targets.map((column) => column.name).join(', '),
        }),
        stats: { found, columns: targets.length },
      };
    }

    const target: Column = {
      id: freeColumnId(input, preset === undefined ? 'match' : presetId),
      name: preset?.columnName ?? en.columns.match,
    };

    let found = 0;
    const rows: Row[] = input.rows.map((row) => {
      const matches = [...cell(row, source.id).matchAll(pattern)].map(
        (match) => match[capture] ?? match[0],
      );
      if (matches.length > 0) found += 1;
      const value = all ? matches.join(', ') : (matches[0] ?? '');
      return { id: row.id, cells: { ...row.cells, [target.id]: value } };
    });

    return {
      output: withColumns(input, [...input.columns, target], rows),
      summary: format(strings.summary, {
        found: plural(found, strings.found),
        column: target.name,
      }),
      stats: { found },
    };
  },
};
