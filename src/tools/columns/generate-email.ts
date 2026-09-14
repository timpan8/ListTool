import { cell, makeRow } from '../../core/model';
import { booleanOption, stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format } from '../../i18n/format';
import { freeColumnId, withColumns } from '../helpers';

const strings = en.tools.generateEmail;

/** Åsa → Asa, Öberg → Oberg: what an address usually has to become. */
function fold(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export const generateEmailTool: Tool = {
  id: 'generate-email',
  name: strings.name,
  category: 'columns',
  description: strings.description,
  keywords: ['generate', 'email', 'address', 'build', 'pattern'],
  arity: 'single',
  options: [
    { key: 'first', label: en.columns.first, type: 'column', default: 'first' },
    { key: 'last', label: en.columns.last, type: 'column', default: 'last' },
    {
      key: 'pattern',
      label: strings.pattern,
      type: 'text',
      default: '{first}.{last}',
      help: strings.patternHelp,
    },
    { key: 'domain', label: strings.domain, type: 'text', default: 'example.com' },
    { key: 'lowercase', label: strings.lowercase, type: 'boolean', default: true },
    {
      key: 'stripDiacritics',
      label: strings.stripDiacritics,
      type: 'boolean',
      default: true,
    },
  ],
  appliesTo(input) {
    return input.columns.length >= 2;
  },
  run(input, options) {
    const firstId = stringOption(options, 'first', 'first');
    const lastId = stringOption(options, 'last', 'last');
    const pattern = stringOption(options, 'pattern', '{first}.{last}');
    const domain = stringOption(options, 'domain', 'example.com').replace(/^@/, '');
    const lowercase = booleanOption(options, 'lowercase', true);
    const strip = booleanOption(options, 'stripDiacritics', true);

    const target = { id: freeColumnId(input, 'generated'), name: strings.columnName };
    let count = 0;

    const rows = input.rows.map((row, index) => {
      const prepare = (value: string): string => {
        const folded = strip ? fold(value) : value;
        const cleaned = folded.trim().replace(/\s+/g, '-');
        return lowercase ? cleaned.toLocaleLowerCase() : cleaned;
      };

      const local = pattern
        .split('{first}')
        .join(prepare(cell(row, firstId)))
        .split('{last}')
        .join(prepare(cell(row, lastId)));

      const value = local === '' || domain === '' ? '' : `${local}@${domain}`;
      if (value !== '') count += 1;
      return makeRow(index, { ...row.cells, [target.id]: value });
    });

    return {
      output: withColumns(input, [...input.columns, target], rows),
      summary: format(strings.summary, { count }),
      stats: { generated: count },
    };
  },
};
