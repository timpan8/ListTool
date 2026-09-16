import { stringOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format } from '../../i18n/format';
import { cellsPhrase, mapCells, targetColumns, withRows } from '../helpers';

const strings = ui.tools.changeCase;

/**
 * Title-case one word. A hyphen always starts a new part (Anna-Maria). An apostrophe
 * does so only after a very short prefix, which capitalises O'Brien and D'Angelo while
 * leaving contractions like "don't" alone.
 */
function titleCaseWord(word: string): string {
  let out = '';
  let capitalise = true;
  let lettersInPart = 0;

  for (const char of word.toLocaleLowerCase()) {
    if (char === '-') {
      out += char;
      capitalise = true;
      lettersInPart = 0;
      continue;
    }
    if (char === "'" || char === '’') {
      out += char;
      capitalise = lettersInPart <= 2;
      lettersInPart = 0;
      continue;
    }
    out += capitalise ? char.toLocaleUpperCase() : char;
    capitalise = false;
    lettersInPart += 1;
  }
  return out;
}

function titleCase(value: string): string {
  return value.replace(/\p{L}[\p{L}\p{M}'’-]*/gu, titleCaseWord);
}

/** First letter of each sentence capitalised, the rest lowered. */
function sentenceCase(value: string): string {
  const lower = value.toLocaleLowerCase();
  return lower.replace(/(^\s*\p{L})|([.!?]\s+\p{L})/gu, (match) => match.toLocaleUpperCase());
}

export function applyCase(value: string, mode: string): string {
  if (mode === 'upper') return value.toLocaleUpperCase();
  if (mode === 'lower') return value.toLocaleLowerCase();
  if (mode === 'title') return titleCase(value);
  if (mode === 'sentence') return sentenceCase(value);
  return value;
}

export const changeCaseTool: Tool = {
  id: 'change-case',
  name: strings.name,
  category: 'clean',
  description: strings.description,
  keywords: ['case', 'upper', 'lower', 'title', 'sentence', 'capital'],
  arity: 'single',
  options: [
    { key: 'column', label: ui.tools.shared.column, type: 'column', default: '', allowAll: true },
    {
      key: 'mode',
      label: strings.mode,
      type: 'select',
      default: 'lower',
      choices: [
        { value: 'upper', label: strings.upper },
        { value: 'lower', label: strings.lower },
        { value: 'title', label: strings.title },
        { value: 'sentence', label: strings.sentence },
      ],
    },
  ],
  run(input, options) {
    const mode = stringOption(options, 'mode', 'lower');
    const columns = targetColumns(input, options);
    const { rows, changed } = mapCells(input, columns, (value) => applyCase(value, mode));

    return {
      output: changed === 0 ? input : withRows(input, rows),
      summary:
        changed === 0
          ? ui.tools.nothingChanged
          : format(strings.summary, { cells: cellsPhrase(changed) }),
      stats: { changed },
    };
  },
};
