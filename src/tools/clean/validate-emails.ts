import { cell, makeRow } from '../../core/model';
import type { Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { freeColumnId, targetColumn, withColumns } from '../helpers';

const strings = en.tools.validateEmails;

/**
 * Deliberately practical rather than RFC-complete: one @, something on each side, a dot
 * in the domain, no whitespace and no list separators. It flags what a mail server will
 * reject, which is what the user is actually asking.
 */
const VALID = /^[^\s@,;]+@[^\s@,;.]+(\.[^\s@,;.]+)+$/;

export function isValidEmail(value: string): boolean {
  return VALID.test(value.trim());
}

export const validateEmailsTool: Tool = {
  id: 'validate-emails',
  name: strings.name,
  category: 'clean',
  description: strings.description,
  keywords: ['validate', 'email', 'check', 'malformed', 'invalid', 'address'],
  arity: 'single',
  options: [{ key: 'column', label: strings.column, type: 'column', default: 'email' }],
  run(input, options) {
    const source = targetColumn(input, options);
    if (source === undefined) return { output: input, summary: en.tools.nothingChanged };

    const validColumn = { id: freeColumnId(input, 'valid'), name: strings.validColumn };
    let bad = 0;

    const rows = input.rows.map((row, index) => {
      const ok = isValidEmail(cell(row, source.id));
      if (!ok) bad += 1;
      return makeRow(index, { ...row.cells, [validColumn.id]: ok ? strings.yes : strings.no });
    });

    return {
      output: withColumns(input, [...input.columns, validColumn], rows),
      summary: format(strings.summary, { bad, total: input.rows.length }),
      stats: { invalid: bad },
    };
  },
  check(input) {
    // Only where a column actually holds addresses: flagging "3 of 3 names are malformed
    // email" would be noise, not a finding.
    const column = input.columns.find(
      (candidate) => candidate.id === 'email' || /mail|post/i.test(candidate.name),
    );
    if (column === undefined) return null;

    const bad = input.rows.filter((row) => {
      const value = cell(row, column.id).trim();
      return value !== '' && !isValidEmail(value);
    }).length;
    if (bad === 0) return null;

    return { summary: plural(bad, strings.found), count: bad, options: { column: column.id } };
  },
};
