import { describe, expect, it } from 'vitest';
import { compareDatasets, pairColumns, selectRows, sideBySide, type CompareLabels } from './compare';
import { cell, VALUE_COLUMN } from './model';
import { cellKey } from './diff';
import { linesParser } from '../parsers/lines';
import type { NormalizeOptions } from './normalize';
import { COMPARE_A, COMPARE_B, listOf, tableOf } from '../test/fixtures';

const NORMALIZE: NormalizeOptions = { trim: true, ignoreCase: true };
const DEFAULTS = { keyA: [VALUE_COLUMN], keyB: [VALUE_COLUMN], normalize: NORMALIZE };

function compare(a: string[], b: string[], normalize: NormalizeOptions = NORMALIZE) {
  return compareDatasets(listOf(...a), listOf(...b), { ...DEFAULTS, normalize });
}

describe('compareDatasets', () => {
  it('reports a clean match', () => {
    const result = compare(['a'], ['a']);
    expect(result.rows[0]).toMatchObject({ status: 'match', countA: 1, countB: 1 });
  });

  it('reports what only one side has', () => {
    const result = compare(['a'], ['b']);
    expect(result.rows.map((row) => row.status)).toEqual(['only-a', 'only-b']);
  });

  it('keeps duplicate counts instead of collapsing them to a set', () => {
    const result = compareDatasets(
      linesParser.parse(COMPARE_A, {}),
      linesParser.parse(COMPARE_B, {}),
      DEFAULTS,
    );

    const anna = result.rows.find((row) => row.key === 'anna@example.com');
    expect(anna).toMatchObject({ countA: 2, countB: 1, status: 'count-differs' });

    const bob = result.rows.find((row) => row.key === 'bob@example.com');
    expect(bob).toMatchObject({ countA: 1, countB: 2, status: 'count-differs' });
  });

  it('counts each status', () => {
    const result = compareDatasets(
      linesParser.parse(COMPARE_A, {}),
      linesParser.parse(COMPARE_B, {}),
      DEFAULTS,
    );
    expect(result.stats).toEqual({
      match: 0,
      'count-differs': 2,
      'only-a': 1,
      'only-b': 1,
    });
  });

  it('matches across case and padding with the default normalization', () => {
    expect(compare(['Anna@X.se '], ['anna@x.se']).rows[0]?.status).toBe('match');
  });

  it('shows each side as it is actually written', () => {
    const row = compare(['Anna@X.se '], ['anna@x.se']).rows[0];
    expect([row?.a, row?.b]).toEqual(['Anna@X.se ', 'anna@x.se']);
  });

  it('stops matching when normalization is turned off', () => {
    expect(compare(['Anna'], ['anna'], {}).rows).toHaveLength(2);
  });

  it('keeps Åsa and Asa apart unless diacritics are ignored', () => {
    expect(compare(['Åsa'], ['Asa']).rows).toHaveLength(2);
    expect(
      compare(['Åsa'], ['Asa'], { trim: true, ignoreCase: true, ignoreDiacritics: true }).rows,
    ).toHaveLength(1);
  });

  it('lists A in its own order, then whatever only B has', () => {
    expect(compare(['b', 'a'], ['a', 'c']).rows.map((row) => row.key)).toEqual(['b', 'a', 'c']);
  });

  it('handles two empty lists', () => {
    expect(compare([], []).rows).toEqual([]);
  });

  it('handles one empty list', () => {
    expect(compare(['a'], []).rows.map((row) => row.status)).toEqual(['only-a']);
  });

  it('matches on a chosen column and keeps the whole row behind it', () => {
    const a = tableOf(['name', 'email'], [{ name: 'Anna A', email: 'anna@example.com' }]);
    const b = tableOf(['who', 'email'], [{ who: 'A. Andersson', email: 'ANNA@example.com' }]);
    const result = compareDatasets(a, b, {
      keyA: ['email'],
      keyB: ['email'],
      normalize: { trim: true, ignoreCase: true },
    });

    expect(result.rows[0]?.status).toBe('match');
    expect(cell(result.rows[0]!.rowsA[0]!, 'name')).toBe('Anna A');
    expect(cell(result.rows[0]!.rowsB[0]!, 'who')).toBe('A. Andersson');
  });

  it('matches on several columns at once when no single one identifies a row', () => {
    const a = tableOf(
      ['first', 'last'],
      [
        { first: 'Anna', last: 'Andersson' },
        { first: 'Anna', last: 'Berg' },
      ],
    );
    const b = tableOf(
      ['first', 'last'],
      [{ first: 'anna', last: 'andersson' }],
    );
    const result = compareDatasets(a, b, {
      keyA: ['first', 'last'],
      keyB: ['first', 'last'],
      normalize: NORMALIZE,
    });

    expect(result.stats).toEqual({ match: 1, 'count-differs': 0, 'only-a': 1, 'only-b': 0 });
    expect(result.rows[0]?.a).toBe('Anna \u00b7 Andersson');
  });

  it('cannot be fooled into a match by moving text across the compound key', () => {
    const a = tableOf(['first', 'last'], [{ first: 'Anna', last: 'Berg' }]);
    const b = tableOf(['first', 'last'], [{ first: 'Anna Berg', last: '' }]);
    const result = compareDatasets(a, b, {
      keyA: ['first', 'last'],
      keyB: ['first', 'last'],
      normalize: NORMALIZE,
    });

    expect(result.rows.map((row) => row.status)).toEqual(['only-a', 'only-b']);
  });

  it('never mutates the lists it compares', () => {
    const a = listOf('x');
    const before = JSON.stringify(a);
    compareDatasets(a, listOf('y'), DEFAULTS);
    expect(JSON.stringify(a)).toBe(before);
  });
});

const LABELS: CompareLabels = {
  status: 'Status',
  countA: 'Count in Kunder',
  countB: 'Count in Leads',
  missing: '—',
  statusText: (row) =>
    row.status === 'count-differs' ? `${row.countA} vs ${row.countB}` : row.status,
};

function named(name: string, ...values: string[]) {
  return { ...listOf(...values), name };
}

describe('pairColumns', () => {
  it('pairs columns by name, whatever their ids and case', () => {
    const a = tableOf(['c1', 'c2'], [{ c1: 'x', c2: 'y' }]);
    const b = tableOf(['c9', 'c8'], [{ c9: 'x', c8: 'y' }]);
    a.columns[0]!.name = 'Name';
    a.columns[1]!.name = 'City';
    b.columns[0]!.name = 'city';
    b.columns[1]!.name = 'name';
    expect(pairColumns(a, b).map(([left, right]) => [left.id, right.id])).toEqual([
      ['c1', 'c8'],
      ['c2', 'c9'],
    ]);
  });

  it('falls back to the id for columns whose names do not pair', () => {
    const a = tableOf(['email', 'note'], [{ email: 'x', note: 'y' }]);
    const b = tableOf(['email', 'other'], [{ email: 'x', other: 'y' }]);
    a.columns[0]!.name = 'E-mail';
    b.columns[0]!.name = 'Address';
    expect(pairColumns(a, b).map(([left, right]) => [left.id, right.id])).toEqual([
      ['email', 'email'],
    ]);
  });

  it('never pairs one column twice', () => {
    const a = tableOf(['x', 'y'], [{ x: '1', y: '2' }]);
    const b = tableOf(['z'], [{ z: '1' }]);
    a.columns[0]!.name = 'Same';
    a.columns[1]!.name = 'Same';
    b.columns[0]!.name = 'same';
    expect(pairColumns(a, b)).toHaveLength(1);
  });
});

describe('sideBySide', () => {
  it('lays the status, then every column of each list, side by side', () => {
    const a = { ...tableOf(['name', 'city'], [{ name: 'Anna', city: 'Göteborg' }]), name: 'Kunder' };
    const b = { ...tableOf(['name', 'city'], [{ name: 'Anna', city: 'Borås' }]), name: 'Leads' };
    const result = compareDatasets(a, b, { keyA: ['name'], keyB: ['name'], normalize: NORMALIZE });
    const side = sideBySide(result, a, b, LABELS, NORMALIZE);

    expect(side.dataset.columns.map((column) => column.id)).toEqual([
      'status',
      'a_name',
      'a_city',
      'b_name',
      'b_city',
    ]);
    expect(side.dataset.columns.map((column) => column.name)).toEqual([
      'Status',
      'name',
      'city',
      'name',
      'city',
    ]);
    expect(side.groups).toEqual([
      { name: 'Kunder', columnIds: ['a_name', 'a_city'] },
      { name: 'Leads', columnIds: ['b_name', 'b_city'] },
    ]);
    const row = side.dataset.rows[0]!;
    expect(cell(row, 'status')).toBe('match');
    expect(cell(row, 'a_city')).toBe('Göteborg');
    expect(cell(row, 'b_city')).toBe('Borås');
  });

  it('marks both cells of a paired column that differs, and nothing else', () => {
    const a = { ...tableOf(['name', 'city'], [{ name: 'Anna', city: 'Göteborg' }]), name: 'A' };
    const b = { ...tableOf(['name', 'city'], [{ name: 'anna', city: 'Borås' }]), name: 'B' };
    const result = compareDatasets(a, b, { keyA: ['name'], keyB: ['name'], normalize: NORMALIZE });
    const side = sideBySide(result, a, b, LABELS, NORMALIZE);
    const id = side.dataset.rows[0]!.id;
    expect([...side.changedCells].sort()).toEqual(
      [cellKey(id, 'a_city'), cellKey(id, 'b_city')].sort(),
    );
  });

  it('compares with the same rules the keys matched on', () => {
    const a = { ...tableOf(['k', 'v'], [{ k: '1', v: 'Anna' }]), name: 'A' };
    const b = { ...tableOf(['k', 'v'], [{ k: '1', v: 'ANNA ' }]), name: 'B' };
    const result = compareDatasets(a, b, { keyA: ['k'], keyB: ['k'], normalize: NORMALIZE });
    expect(sideBySide(result, a, b, LABELS, NORMALIZE).changedCells.size).toBe(0);
    expect(sideBySide(result, a, b, LABELS, {}).changedCells.size).toBe(2);
  });

  it('shows a dash on the side that has no row, and marks nothing there', () => {
    const a = named('Kunder', 'a');
    const b = named('Leads', 'b');
    const result = compareDatasets(a, b, DEFAULTS);
    const side = sideBySide(result, a, b, LABELS, NORMALIZE);
    expect(cell(side.dataset.rows[0]!, 'b_value')).toBe('—');
    expect(cell(side.dataset.rows[1]!, 'a_value')).toBe('—');
    expect(side.changedCells.size).toBe(0);
    expect([...side.statusOf.values()]).toEqual(['only-a', 'only-b']);
  });

  it('adds count columns only when some key repeats', () => {
    const plain = sideBySide(compare(['a'], ['a']), named('A', 'a'), named('B', 'a'), LABELS, NORMALIZE);
    expect(plain.dataset.columns.map((column) => column.id)).not.toContain('a_#');

    const doubled = sideBySide(compare(['a', 'a'], ['a']), named('A', 'a', 'a'), named('B', 'a'), LABELS, NORMALIZE);
    expect(doubled.dataset.columns.map((column) => column.id)).toEqual([
      'status',
      'a_value',
      'a_#',
      'b_value',
      'b_#',
    ]);
    expect(cell(doubled.dataset.rows[0]!, 'a_#')).toBe('2');
    expect(cell(doubled.dataset.rows[0]!, 'status')).toBe('2 vs 1');
    expect(doubled.groups[0]?.columnIds).toEqual(['a_value', 'a_#']);
  });
});

describe('selectRows', () => {
  const rows = compare(['a', 'a', 'b'], ['a', 'c']).rows;

  it('takes every A row of the keys both share', () => {
    expect(selectRows(rows, 'both').a).toHaveLength(2);
  });

  it('takes only what A alone has', () => {
    const only = selectRows(rows, 'only-a');
    expect(only.a.map((row) => cell(row, VALUE_COLUMN))).toEqual(['b']);
  });

  it('takes only what B alone has', () => {
    const only = selectRows(rows, 'only-b');
    expect(only.b.map((row) => cell(row, VALUE_COLUMN))).toEqual(['c']);
  });

  it('takes one row per key for the union', () => {
    const union = selectRows(rows, 'union');
    expect(union.a.map((row) => cell(row, VALUE_COLUMN))).toEqual(['a', 'b']);
    expect(union.b.map((row) => cell(row, VALUE_COLUMN))).toEqual(['c']);
  });

  it('takes everything that is not on both sides for the differences', () => {
    const differences = selectRows(rows, 'differences');
    expect(differences.a.map((row) => cell(row, VALUE_COLUMN))).toEqual(['b']);
    expect(differences.b.map((row) => cell(row, VALUE_COLUMN))).toEqual(['c']);
  });

  it('returns nothing for lists with nothing in common', () => {
    expect(selectRows(compare(['a'], ['b']).rows, 'both').a).toEqual([]);
  });
});
