import type { Parser } from '../core/registry';
import { linesParser } from './lines';
import { delimitedParser } from './delimited';
import { csvParser } from './csv';
import { recipientsParser } from './recipients';
import { emailsInTextParser } from './emails-in-text';

/**
 * The parser registry. Adding a parser means adding one module, its test, and one line
 * here — the shell is never edited for it.
 */
export const parsers: Parser[] = [
  linesParser,
  delimitedParser,
  csvParser,
  recipientsParser,
  emailsInTextParser,
];

export function parserById(id: string): Parser | undefined {
  return parsers.find((parser) => parser.id === id);
}

/** The parser to fall back on when detection finds nothing: every input is lines. */
export const defaultParser: Parser = linesParser;
