import { cell, type Column, type Row } from '../../core/model';
import { booleanOption, stringOption, type Tool } from '../../core/registry';
import { looksLikeSwedishId, readSwedishId, type SwedishIdKind } from '../../core/swedish-id';
import { ui } from '../../i18n';
import { format, plural } from '../../i18n/format';
import { freeColumnId, rowsPhrase, targetColumn, withColumns } from '../helpers';

const strings = ui.tools.validateSwedishIds;

/** Whether the chosen kind of number takes this one. */
function accepted(kind: string, found: SwedishIdKind): boolean {
  if (kind === 'person') return found !== 'organisationsnummer';
  if (kind === 'organisation') return found === 'organisationsnummer';
  return true;
}

export const validateSwedishIdsTool: Tool = {
  id: 'validate-swedish-ids',
  name: strings.name,
  category: 'clean',
  description: strings.description,
  keywords: [
    'personnummer',
    'samordningsnummer',
    'organisationsnummer',
    'luhn',
    'validate',
    'swedish',
    'id',
  ],
  arity: 'single',
  options: [
    { key: 'column', label: ui.tools.shared.column, type: 'column' },
    {
      key: 'kind',
      label: strings.kind,
      type: 'select',
      default: 'any',
      choices: [
        { value: 'any', label: strings.kindAny },
        { value: 'person', label: strings.kindPerson },
        { value: 'organisation', label: strings.kindOrganisation },
      ],
    },
    { key: 'normalize', label: strings.normalize, type: 'boolean', default: true },
  ],
  run(input, options) {
    const source = targetColumn(input, options);
    if (source === undefined) return { output: input, summary: ui.tools.nothingChanged };

    const kind = stringOption(options, 'kind', 'any');
    const normalize = booleanOption(options, 'normalize', true);
    const validColumn: Column = { id: freeColumnId(input, 'valid'), name: strings.validColumn };
    const normalizedColumn: Column = {
      id: freeColumnId(input, 'id'),
      name: strings.normalizedColumn,
    };
    let valid = 0;

    // The source is never rewritten: the reading lands beside it.
    const rows: Row[] = input.rows.map((row) => {
      const read = readSwedishId(cell(row, source.id));
      const ok = read !== null && accepted(kind, read.kind);
      if (ok) valid += 1;
      return {
        id: row.id,
        cells: {
          ...row.cells,
          [validColumn.id]: ok ? strings.kinds[read.kind] : strings.no,
          ...(normalize ? { [normalizedColumn.id]: ok ? read.normalized : '' } : {}),
        },
      };
    });

    return {
      output: withColumns(
        input,
        [...input.columns, validColumn, ...(normalize ? [normalizedColumn] : [])],
        rows,
      ),
      summary: format(strings.summary, { valid, rows: rowsPhrase(input.rows.length) }),
      stats: { valid, invalid: input.rows.length - valid },
    };
  },
  check(input) {
    // A column that is mostly ID numbers, with some that do not check out.
    let failing = 0;
    let where: string | undefined;
    for (const column of input.columns) {
      let shaped = 0;
      let bad = 0;
      let filled = 0;
      for (const row of input.rows) {
        const value = cell(row, column.id);
        if (value.trim() === '') continue;
        filled += 1;
        if (!looksLikeSwedishId(value)) continue;
        shaped += 1;
        if (readSwedishId(value) === null) bad += 1;
      }
      // Most of the column must be shaped like ID numbers before a failure means anything.
      if (filled > 0 && shaped / filled > 0.5 && bad > failing) {
        failing = bad;
        where = column.id;
      }
    }
    if (failing === 0 || where === undefined) return null;
    return { summary: plural(failing, strings.found), count: failing, options: { column: where } };
  },
};
