import { booleanOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format, plural } from '../../i18n/format';
import { cell } from '../../core/model';
import { cellsPhrase, mapCells, targetColumns, withRows } from '../helpers';

const strings = ui.tools.cleanInvisible;

/**
 * Spaces that are not the space key: non-breaking, thin, ideographic and the rest of the
 * Unicode space run. A pasted list is full of them, and they make two identical-looking
 * values fail to match. The figure space is left out on purpose: it is a real width.
 */
const ODD_SPACES = /[\u00a0\u1680\u2000-\u2006\u2008-\u200a\u202f\u205f\u3000]/g;

/**
 * Characters with no width at all: the zero-width set, the BOM, the soft hyphen and the
 * bidi marks. Nothing shows, and every one of them breaks a comparison.
 */
const ZERO_WIDTH =
  /[\u00ad\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060-\u2064\u206a-\u206f\ufeff]/g;

/** C0 and C1 control codes, but never tab, carriage return or newline. */
const CONTROLS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g;

// The same characters as non-global tests: a global regex carries lastIndex between
// calls, and a check runs over every cell of a list.
const ANY_ODD_SPACE = new RegExp(ODD_SPACES.source, 'u');
const ANY_ZERO_WIDTH = new RegExp(ZERO_WIDTH.source, 'u');
const ANY_CONTROL = new RegExp(CONTROLS.source, 'u');

export const cleanInvisibleTool: Tool = {
  id: 'clean-invisible',
  name: strings.name,
  category: 'clean',
  description: strings.description,
  keywords: [
    'invisible',
    'zero width',
    'nbsp',
    'non-breaking',
    'bom',
    'control',
    'hidden',
    'whitespace',
  ],
  arity: 'single',
  options: [
    { key: 'column', label: ui.tools.shared.column, type: 'column', default: '', allowAll: true },
    { key: 'spaces', label: strings.spaces, type: 'boolean', default: true },
    { key: 'zeroWidth', label: strings.zeroWidth, type: 'boolean', default: true },
    { key: 'controls', label: strings.controls, type: 'boolean', default: true },
  ],
  run(input, options) {
    const spaces = booleanOption(options, 'spaces', true);
    const zeroWidth = booleanOption(options, 'zeroWidth', true);
    const controls = booleanOption(options, 'controls', true);

    let removed = 0;
    const drop = (): string => {
      removed += 1;
      return '';
    };

    const { rows, changed } = mapCells(input, targetColumns(input, options), (value) => {
      let cleaned = value;
      // An odd space becomes an ordinary space; the rest go, and are counted.
      if (spaces) cleaned = cleaned.replace(ODD_SPACES, ' ');
      if (zeroWidth) cleaned = cleaned.replace(ZERO_WIDTH, drop);
      if (controls) cleaned = cleaned.replace(CONTROLS, drop);
      return cleaned;
    });

    if (changed === 0) {
      return { output: input, summary: ui.tools.nothingChanged, warnings: [strings.nothing] };
    }

    return {
      output: withRows(input, rows),
      summary: format(strings.summary, { cells: cellsPhrase(changed) }),
      stats: { changed, removed },
      ...(removed > 0 ? { warnings: [format(strings.found, { n: removed })] } : {}),
    };
  },
  check(input) {
    const cells = input.rows.reduce(
      (count, row) =>
        count +
        input.columns.filter((column) => {
          const value = cell(row, column.id);
          return ANY_ODD_SPACE.test(value) || ANY_ZERO_WIDTH.test(value) || ANY_CONTROL.test(value);
        }).length,
      0,
    );
    if (cells === 0) return null;
    return { summary: plural(cells, strings.foundCheck), count: cells, options: { column: '' } };
  },
};
