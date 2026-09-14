import { cell } from '../../core/model';
import { booleanOption, stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { safeRegExp, targetColumns, withRows } from '../helpers';

const strings = en.tools.filter;

function matches(value: string, mode: string, pattern: string, ignoreCase: boolean): boolean {
  if (mode === 'regex') {
    const regex = safeRegExp(pattern, ignoreCase ? 'iu' : 'u');
    return regex !== null && regex.test(value);
  }
  const haystack = ignoreCase ? value.toLocaleLowerCase() : value;
  const needle = ignoreCase ? pattern.toLocaleLowerCase() : pattern;

  if (mode === 'equals') return haystack === needle;
  if (mode === 'starts') return haystack.startsWith(needle);
  if (mode === 'ends') return haystack.endsWith(needle);
  return haystack.includes(needle);
}

export const filterRowsTool: Tool = {
  id: 'filter-rows',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['filter', 'keep', 'remove', 'contains', 'match', 'search', 'regex'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column', default: '', allowAll: true },
    {
      key: 'mode',
      label: strings.mode,
      type: 'select',
      default: 'contains',
      choices: [
        { value: 'contains', label: strings.contains },
        { value: 'equals', label: strings.equals },
        { value: 'starts', label: strings.startsWith },
        { value: 'ends', label: strings.endsWith },
        { value: 'regex', label: strings.regex },
      ],
    },
    { key: 'pattern', label: strings.pattern, type: 'text', default: '' },
    { key: 'ignoreCase', label: en.tools.shared.ignoreCase, type: 'boolean', default: true },
    { key: 'invert', label: strings.invert, type: 'boolean', default: false },
  ],
  run(input, options) {
    const pattern = stringOption(options, 'pattern', '');
    const mode = stringOption(options, 'mode', 'contains');
    const ignoreCase = booleanOption(options, 'ignoreCase', true);
    const invert = booleanOption(options, 'invert', false);
    const columns = targetColumns(input, options);

    if (pattern === '') {
      return { output: input, summary: en.tools.nothingChanged };
    }
    if (mode === 'regex' && safeRegExp(pattern, ignoreCase ? 'iu' : 'u') === null) {
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.badRegex] };
    }

    const kept = input.rows.filter((row) => {
      const hit = columns.some((column) =>
        matches(cell(row, column.id), mode, pattern, ignoreCase),
      );
      return invert ? !hit : hit;
    });

    return {
      output: withRows(input, kept),
      summary: format(strings.summary, { kept: kept.length, before: input.rows.length }),
      stats: { kept: kept.length, removed: input.rows.length - kept.length },
    };
  },
};
