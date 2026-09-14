import type { Options, Parser } from './registry';

/** Split on CRLF, CR or LF so pasted Windows text behaves like everything else. */
export function splitLines(input: string): string[] {
  return input.split(/\r\n|\r|\n/);
}

export function nonEmptyLines(input: string): string[] {
  return splitLines(input).filter((line) => line.trim() !== '');
}

export interface DelimiterPreset {
  /** Stable id; the label comes from i18n. */
  id: string;
  value: string;
}

export const DELIMITER_PRESETS: DelimiterPreset[] = [
  { id: 'newline', value: '\n' },
  { id: 'comma', value: ',' },
  { id: 'semicolon', value: ';' },
  { id: 'tab', value: '\t' },
  { id: 'pipe', value: '|' },
  { id: 'space', value: ' ' },
];

/** Candidates the detector considers, in the order SPEC §3 lists them. */
const CANDIDATES: { value: string; pattern: RegExp }[] = [
  { value: '\t', pattern: /\t/g },
  { value: ';', pattern: /;/g },
  { value: ',', pattern: /,/g },
  { value: '|', pattern: /\|/g },
  { value: '  ', pattern: / {2,}/g },
];

/**
 * Blank out the contents of double-quoted spans so a delimiter inside a quoted field
 * is not counted as a separator. Without this, `"Andersson, Anna",anna@example.com`
 * reads as two commas and the whole file looks inconsistent. `""` is an escaped quote,
 * exactly as in RFC 4180.
 */
export function withoutQuotedSpans(line: string): string {
  let out = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes) out += char;
  }
  return out;
}

function countMatches(line: string, pattern: RegExp): number {
  return withoutQuotedSpans(line).match(new RegExp(pattern.source, 'g'))?.length ?? 0;
}

/**
 * Pick the candidate with the highest per-line count that is consistent across every
 * non-empty line. Returns null when no candidate is consistent — which SPEC §3 reads as
 * "one item per line".
 */
export function detectDelimiter(input: string): { delimiter: string; perLine: number } | null {
  const lines = nonEmptyLines(input);
  if (lines.length === 0) return null;

  let best: { delimiter: string; perLine: number } | null = null;
  for (const candidate of CANDIDATES) {
    const counts = lines.map((line) => countMatches(line, candidate.pattern));
    const first = counts[0] ?? 0;
    if (first === 0) continue;
    if (!counts.every((count) => count === first)) continue;
    if (best === null || first > best.perLine) {
      best = { delimiter: candidate.value, perLine: first };
    }
  }
  return best;
}

/**
 * Ask every registered parser what it makes of the input and take the most confident
 * answer. Adding a parser therefore changes detection without touching the shell.
 */
export function bestParser(
  parsers: Parser[],
  input: string,
): { parser: Parser; options: Options; confidence: number } | null {
  let best: { parser: Parser; options: Options; confidence: number } | null = null;
  for (const parser of parsers) {
    const detected = parser.detect(input);
    if (detected === null || detected.confidence <= 0) continue;
    if (best === null || detected.confidence > best.confidence) {
      best = { parser, options: detected.options, confidence: detected.confidence };
    }
  }
  return best;
}

const ESCAPES: { text: string; value: string }[] = [
  { text: '\\t', value: '\t' },
  { text: '\\n', value: '\n' },
  { text: '\\r', value: '\r' },
];

/** Show an invisible delimiter as something typeable: a tab reads as \t. */
export function escapeDelimiter(value: string): string {
  return ESCAPES.reduce((text, escape) => text.split(escape.value).join(escape.text), value);
}

/** Turn what the user typed back into the real delimiter. */
export function unescapeDelimiter(text: string): string {
  return ESCAPES.reduce((value, escape) => value.split(escape.text).join(escape.value), text);
}
