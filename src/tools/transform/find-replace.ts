import { booleanOption, stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { cellsPhrase, mapCells, safeRegExp, targetColumns, withRows } from '../helpers';

const strings = en.tools.replace;

/** Escape a plain string so it can be used as a literal pattern. */
function escapeLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const findReplaceTool: Tool = {
  id: 'find-replace',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['find', 'replace', 'substitute', 'regex', 'swap', 'text'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column', default: '', allowAll: true },
    { key: 'find', label: strings.find, type: 'text', default: '' },
    { key: 'replace', label: strings.replace, type: 'text', default: '' },
    { key: 'regex', label: strings.regex, type: 'boolean', default: false },
    { key: 'ignoreCase', label: en.tools.shared.ignoreCase, type: 'boolean', default: true },
  ],
  run(input, options) {
    const find = stringOption(options, 'find', '');
    const replace = stringOption(options, 'replace', '');
    const asRegex = booleanOption(options, 'regex', false);
    // Case is ignored by default, as it is everywhere else a value is matched.
    const flags = booleanOption(options, 'ignoreCase', true) ? 'giu' : 'gu';

    if (find === '') {
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.emptyFind] };
    }

    const pattern = safeRegExp(asRegex ? find : escapeLiteral(find), flags);
    if (pattern === null) {
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.badRegex] };
    }

    let occurrences = 0;
    const { rows, changed } = mapCells(input, targetColumns(input, options), (value) => {
      occurrences += value.match(pattern)?.length ?? 0;
      return value.replace(pattern, replace);
    });

    return {
      output: changed === 0 ? input : withRows(input, rows),
      summary:
        changed === 0
          ? en.tools.nothingChanged
          : format(strings.summary, {
              count: plural(occurrences, strings.occurrences),
              cells: cellsPhrase(changed),
            }),
      stats: { occurrences, changed },
    };
  },
};
