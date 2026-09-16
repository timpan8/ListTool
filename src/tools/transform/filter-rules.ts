import { cell } from '../../core/model';
import { booleanOption, stringOption, type OptionField, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format, plural } from '../../i18n/format';
import { matchesText, rowsPhrase, safeRegExp, targetColumns, withRows } from '../helpers';

const strings = ui.tools.filterRules;

/** Three slots. A rule with no text is not a rule, which is how you use fewer than three. */
const SLOTS = [
  { column: 'column', mode: 'mode', pattern: 'pattern' },
  { column: 'column2', mode: 'mode2', pattern: 'pattern2' },
  { column: 'column3', mode: 'mode3', pattern: 'pattern3' },
];

const MODES = [
  { value: 'contains', label: ui.tools.filter.contains },
  { value: 'equals', label: ui.tools.filter.equals },
  { value: 'starts', label: ui.tools.filter.startsWith },
  { value: 'ends', label: ui.tools.filter.endsWith },
  { value: 'regex', label: ui.tools.filter.regex },
];

function slotFields(): OptionField[] {
  return SLOTS.flatMap((slot, index): OptionField[] => {
    const n = index + 1;
    return [
      {
        key: slot.column,
        label: format(strings.ruleColumn, { n }),
        type: 'column',
        default: '',
        allowAll: true,
      },
      {
        key: slot.mode,
        label: format(strings.ruleMode, { n }),
        type: 'select',
        default: 'contains',
        choices: MODES,
      },
      {
        key: slot.pattern,
        label: format(strings.rulePattern, { n }),
        type: 'text',
        default: '',
        ...(index === 0 ? { help: strings.ruleHelp } : {}),
      },
    ];
  });
}

export const filterRulesTool: Tool = {
  id: 'filter-rules',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['filter', 'rules', 'conditions', 'and', 'or', 'several', 'advanced', 'query'],
  arity: 'single',
  options: [
    {
      key: 'match',
      label: strings.match,
      type: 'select',
      default: 'all',
      choices: [
        { value: 'all', label: strings.matchAll },
        { value: 'any', label: strings.matchAny },
      ],
    },
    ...slotFields(),
    { key: 'ignoreCase', label: ui.tools.shared.ignoreCase, type: 'boolean', default: true },
    { key: 'invert', label: ui.tools.filter.invert, type: 'boolean', default: false },
  ],
  run(input, options) {
    const ignoreCase = booleanOption(options, 'ignoreCase', true);
    const everyRule = stringOption(options, 'match', 'all') === 'all';
    const invert = booleanOption(options, 'invert', false);

    const rules = SLOTS.map((slot) => ({
      columns: targetColumns(input, options, slot.column),
      mode: stringOption(options, slot.mode, 'contains'),
      pattern: stringOption(options, slot.pattern, ''),
    })).filter((rule) => rule.pattern !== '');

    if (rules.length === 0) {
      return { output: input, summary: ui.tools.nothingChanged, warnings: [strings.needRule] };
    }

    // Checked with the flags it will run with, so what passes here runs there.
    const flags = ignoreCase ? 'iu' : 'u';
    const broken = rules.filter(
      (rule) => rule.mode === 'regex' && safeRegExp(rule.pattern, flags) === null,
    );
    if (broken.length > 0) {
      return {
        output: input,
        summary: ui.tools.nothingChanged,
        warnings: [ui.tools.filter.badRegex],
      };
    }

    const kept = input.rows.filter((row) => {
      const hits = rules.map((rule) =>
        rule.columns.some((column) =>
          matchesText(cell(row, column.id), rule.mode, rule.pattern, ignoreCase),
        ),
      );
      const matched = everyRule ? hits.every(Boolean) : hits.some(Boolean);
      return invert ? !matched : matched;
    });

    return {
      output: withRows(input, kept),
      summary: format(strings.summary, {
        kept: kept.length,
        before: rowsPhrase(input.rows.length),
        rules: plural(rules.length, strings.rules),
      }),
      stats: { kept: kept.length, removed: input.rows.length - kept.length, rules: rules.length },
    };
  },
};
