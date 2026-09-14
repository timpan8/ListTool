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
};

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
