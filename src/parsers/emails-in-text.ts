import { valuesDataset } from '../core/model';
import { booleanOption, type Parser } from '../core/registry';
import { en } from '../i18n/en';

const strings = en.parsers.emails;

const EMAIL_ALL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Every address in arbitrary text, in the order they appear. */
export function findEmails(input: string): string[] {
  return input.match(EMAIL_ALL) ?? [];
}

export const emailsInTextParser: Parser = {
  id: 'emails-in-text',
  name: strings.name,
  description: strings.description,
  options: [
    { key: 'dedupe', label: strings.dedupe, type: 'boolean', default: true },
    { key: 'lowercase', label: strings.lowercase, type: 'boolean', default: true },
  ],

  /**
   * Pulling addresses out of prose is a deliberate choice, not something to guess at, so
   * this claims just enough confidence to be offered and never enough to be chosen.
   */
  detect(input) {
    if (findEmails(input).length === 0) return null;
    return { confidence: 0.1, options: {} };
  },

  parse(input, options) {
    const lowercase = booleanOption(options, 'lowercase', true);
    const dedupe = booleanOption(options, 'dedupe', true);

    const found = findEmails(input).map((email) => (lowercase ? email.toLowerCase() : email));
    const values = dedupe ? [...new Set(found)] : found;

    return valuesDataset(values, en.columns.email, input, {
      parserId: 'emails-in-text',
      options,
    });
  },
};
