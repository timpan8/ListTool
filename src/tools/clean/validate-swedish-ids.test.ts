import { describe, expect, it } from 'vitest';
import { validateSwedishIdsTool } from './validate-swedish-ids';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

// Skatteverket's published test numbers, never real people.
const IDS = listOf('811218-9876', '19811218 9876', '811278-9865', '556036-0793', '811218-9877', 'x');

describe('validate Swedish ID numbers tool', () => {
  it('says which kind each value is, and writes the valid ones one way', () => {
    const result = validateSwedishIdsTool.run(IDS, { column: 'value' });
    const [valid, normalized] = result.output.columns.slice(1).map((column) => column.id) as [string, string];
    expect(result.output.rows.map((row) => cell(row, valid))).toEqual([
      'personnummer',
      'personnummer',
      'samordningsnummer',
      'organisationsnummer',
      'no',
      'no',
    ]);
    expect(result.output.rows.map((row) => cell(row, normalized))).toEqual([
      '19811218-9876',
      '19811218-9876',
      '19811278-9865',
      '556036-0793',
      '',
      '',
    ]);
    expect(result.summary).toBe('4 of 6 rows check out');
  });

  it('never rewrites the source column', () => {
    const result = validateSwedishIdsTool.run(IDS, { column: 'value' });
    expect(cell(result.output.rows[1]!, 'value')).toBe('19811218 9876');
    expect(result.output.rows.map((row) => row.id)).toEqual(IDS.rows.map((row) => row.id));
  });

  it('accepts only the kind asked for', () => {
    const people = validateSwedishIdsTool.run(IDS, { column: 'value', kind: 'person' });
    const valid = people.output.columns[1]?.id as string;
    expect(cell(people.output.rows[3]!, valid)).toBe('no');
    const organisations = validateSwedishIdsTool.run(IDS, { column: 'value', kind: 'organisation' });
    expect(cell(organisations.output.rows[0]!, valid)).toBe('no');
    expect(cell(organisations.output.rows[3]!, valid)).toBe('organisationsnummer');
  });

  it('can leave the normalised column out', () => {
    const result = validateSwedishIdsTool.run(IDS, { column: 'value', normalize: false });
    expect(result.output.columns).toHaveLength(2);
  });

  it('flags a column of ID numbers where some do not check out', () => {
    const finding = validateSwedishIdsTool.check?.(IDS);
    expect(finding?.count).toBe(1);
    expect(finding?.options).toEqual({ column: 'value' });
    const names = tableOf(['name'], [{ name: 'Anna' }, { name: '811218-9877' }]);
    expect(validateSwedishIdsTool.check?.(names)).toBeNull();
  });
});
