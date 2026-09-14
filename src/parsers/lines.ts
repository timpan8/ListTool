import { detectDelimiter, splitLines } from '../core/detect';
import { valuesDataset } from '../core/model';
import { booleanOption, type Options, type Parser } from '../core/registry';
import { en } from '../i18n/en';

const strings = en.parsers.lines;

function applyOptions(items: string[], options: Options): string[] {
  const trim = booleanOption(options, 'trim', true);
  const dropEmpty = booleanOption(options, 'dropEmpty', true);
  const trimmed = trim ? items.map((item) => item.trim()) : items;
  return dropEmpty ? trimmed.filter((item) => item.trim() !== '') : trimmed;
}

export const linesParser: Parser = {
  id: 'lines',
  name: strings.name,
  description: strings.description,
  options: [
    { key: 'trim', label: strings.trim, type: 'boolean', default: true },
    { key: 'dropEmpty', label: strings.dropEmpty, type: 'boolean', default: true },
  ],

  /**
   * Lines always works, so it claims only enough confidence to win when nothing else
   * recognises real structure — SPEC §3's "no consistent delimiter → one item per line".
   */
  detect(input) {
    if (input.trim() === '') return null;
    return { confidence: detectDelimiter(input) === null ? 0.6 : 0.2, options: {} };
  },

  parse(input, options) {
    return valuesDataset(applyOptions(splitLines(input), options), en.columns.value, input, {
      parserId: 'lines',
      options,
    });
  },
};
