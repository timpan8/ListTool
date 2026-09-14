import { describe, expect, it } from 'vitest';
import { compareDatasets, selectRows, toAlignedDataset } from './compare';
import { cell, VALUE_COLUMN } from './model';
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

const LABELS = {
  a: 'A',
  b: 'B',
  status: 'Status',
  countA: '#A',
  countB: '#B',
  missing: '—',
  statuses: {
    match: 'Match',
    'count-differs': 'Count differs',
    'only-a': 'Only in A',
    'only-b': 'Only in B',
  },
};

describe('toAlignedDataset', () => {
  it('renders the aligned table SPEC §6 describes', () => {
    const rows = compare(['a', 'c'], ['a', 'd']).rows;
    const dataset = toAlignedDataset(rows, LABELS);

    expect(dataset.columns.map((column) => column.id)).toEqual([
      'a',
      'b',
      'status',
      'countA',
      'countB',
    ]);
    expect(dataset.rows.map((row) => cell(row, 'status'))).toEqual([
      'Match',
      'Only in A',
      'Only in B',
    ]);
  });

  it('marks a missing side with a dash rather than an empty cell', () => {
    const dataset = toAlignedDataset(compare(['a'], []).rows, LABELS);
    expect(cell(dataset.rows[0]!, 'b')).toBe('—');
  });

  it('writes the counts as text so the ordinary exporters can copy them', () => {
    const dataset = toAlignedDataset(compare(['a', 'a'], ['a']).rows, LABELS);
    expect([cell(dataset.rows[0]!, 'countA'), cell(dataset.rows[0]!, 'countB')]).toEqual([
      '2',
      '1',
    ]);
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
