import { describe, expect, it } from 'vitest';
import { startingOptions, withColumnDefaults, withSelection } from './toolOptions';
import { DEFAULT_SETTINGS } from '../core/settings';
import type { Column } from '../core/model';
import type { OptionField, Tool } from '../core/registry';
import { toolById, tools } from '../tools';
import { tableOf } from '../test/fixtures';

const COLUMNS: Column[] = [
  { id: 'c1', name: 'name' },
  { id: 'c2', name: 'email' },
  { id: 'c3', name: 'city' },
];

describe('withColumnDefaults', () => {
  const two: OptionField[] = [
    { key: 'a', label: 'A', type: 'column' },
    { key: 'b', label: 'B', type: 'column' },
  ];

  it('gives an unset column field the first column, and the next field the next one', () => {
    expect(withColumnDefaults(two, {}, COLUMNS)).toEqual({ a: 'c1', b: 'c2' });
  });

  it('replaces a column that is no longer there', () => {
    expect(withColumnDefaults(two, { a: 'first', b: 'last' }, COLUMNS)).toEqual({
      a: 'c1',
      b: 'c2',
    });
  });

  it('keeps a chosen column and steers the other field away from it', () => {
    expect(withColumnDefaults(two, { b: 'c1' }, COLUMNS)).toEqual({ a: 'c2', b: 'c1' });
  });

  it('goes round again when there are more fields than columns', () => {
    const three: OptionField[] = [...two, { key: 'c', label: 'C', type: 'column' }];
    expect(withColumnDefaults(three, {}, COLUMNS.slice(0, 2))).toEqual({
      a: 'c1',
      b: 'c2',
      c: 'c1',
    });
  });

  it('leaves "All columns" and "None" fields alone: an empty value means something there', () => {
    const fields: OptionField[] = [
      { key: 'all', label: 'All', type: 'column', allowAll: true },
      { key: 'none', label: 'None', type: 'column', allowNone: true },
    ];
    expect(withColumnDefaults(fields, {}, COLUMNS)).toEqual({});
    expect(withColumnDefaults(fields, { all: '', none: '' }, COLUMNS)).toEqual({
      all: '',
      none: '',
    });
  });

  it('draws a second-list field from the second list', () => {
    const fields: OptionField[] = [
      { key: 'mine', label: 'Mine', type: 'column' },
      { key: 'theirs', label: 'Theirs', type: 'column', from: 'second' },
    ];
    const second: Column[] = [{ id: 'x', name: 'X' }];
    expect(withColumnDefaults(fields, {}, COLUMNS, second)).toEqual({ mine: 'c1', theirs: 'x' });
  });

  it('leaves a field alone when its list has no columns at all', () => {
    expect(withColumnDefaults(two, { a: 'c1' }, [])).toEqual({ a: 'c1' });
  });

  it('resolves a columns field with a default to the declared columns that exist', () => {
    const fields: OptionField[] = [
      { key: 'keys', label: 'Keys', type: 'columns', default: ['email', 'c3'] },
    ];
    expect(withColumnDefaults(fields, {}, COLUMNS)).toEqual({ keys: ['c3'] });
  });

  it('falls back to the first column when none of the declared ones exist', () => {
    const fields: OptionField[] = [
      { key: 'keys', label: 'Keys', type: 'columns', default: ['email'] },
    ];
    expect(withColumnDefaults(fields, {}, COLUMNS)).toEqual({ keys: ['c1'] });
  });

  it('keeps a valid columns choice, including an empty one', () => {
    const fields: OptionField[] = [
      { key: 'keys', label: 'Keys', type: 'columns', default: ['c1'] },
    ];
    expect(withColumnDefaults(fields, { keys: ['c2', 'c3'] }, COLUMNS)).toEqual({
      keys: ['c2', 'c3'],
    });
    expect(withColumnDefaults(fields, { keys: [] }, COLUMNS)).toEqual({ keys: [] });
  });

  it('never touches a columns field with no default: unset means every column', () => {
    const fields: OptionField[] = [{ key: 'columns', label: 'Columns', type: 'columns' }];
    expect(withColumnDefaults(fields, {}, COLUMNS)).toEqual({});
  });

  it('is idempotent, so it can run on every render', () => {
    const once = withColumnDefaults(two, { b: 'c1' }, COLUMNS);
    expect(withColumnDefaults(two, once, COLUMNS)).toEqual(once);
  });

  it('never mutates the options it was given', () => {
    const options = {};
    withColumnDefaults(two, options, COLUMNS);
    expect(options).toEqual({});
  });
});

describe('startingOptions', () => {
  it('starts a tool from its own defaults', () => {
    const tool = toolById('number-rows') as Tool;
    expect(startingOptions(tool, DEFAULT_SETTINGS).start).toBe(1);
  });

  it('lets a setting decide an option the tool shares with the rest of the app', () => {
    const tool = toolById('sort') as Tool;
    const options = startingOptions(tool, { ...DEFAULT_SETTINGS, sortLocale: 'en' });
    expect(options.locale).toBe('en');
  });
});

describe('withSelection', () => {
  const fields: OptionField[] = [
    { key: 'rows', label: 'Rows', type: 'rows' },
    { key: 'value', label: 'Value', type: 'text', default: '' },
  ];

  it('fills a rows field from the ticks in the table', () => {
    expect(withSelection(fields, { value: 'x' }, ['r1', 'r2'])).toEqual({
      value: 'x',
      rows: ['r1', 'r2'],
    });
  });

  it('writes an empty selection rather than leaving a stale one behind', () => {
    expect(withSelection(fields, { rows: ['r1'] }, [])).toEqual({ rows: [] });
  });

  it('leaves a tool with no rows field exactly as it was', () => {
    const plain: OptionField[] = [{ key: 'value', label: 'Value', type: 'text', default: '' }];
    expect(withSelection(plain, { value: 'x' }, ['r1'])).toEqual({ value: 'x' });
  });

  it('fills every rows field a tool declares, whatever they are called', () => {
    const two: OptionField[] = [
      { key: 'a', label: 'A', type: 'rows' },
      { key: 'b', label: 'B', type: 'rows' },
    ];
    expect(withSelection(two, {}, ['r1'])).toEqual({ a: ['r1'], b: ['r1'] });
  });

  it('never mutates the options it was given', () => {
    const options = { value: 'x' };
    withSelection(fields, options, ['r1']);
    expect(options).toEqual({ value: 'x' });
  });

  it('reaches every registered tool that asks for a selection', () => {
    const asking = tools.filter((tool) =>
      tool.options.some((field) => field.type === 'rows'),
    );
    expect(asking.map((tool) => tool.id).sort()).toEqual(['selected-rows', 'set-value']);
  });
});

describe('every tool, opened on a three-column table', () => {
  const table = tableOf(
    ['c1', 'c2', 'c3'],
    [{ c1: 'Anna', c2: 'anna@example.com', c3: 'Göteborg' }],
  );

  it('opens with column fields that name real, distinct columns', () => {
    for (const tool of tools) {
      const options = withColumnDefaults(
        tool.options,
        startingOptions(tool, DEFAULT_SETTINGS),
        table.columns,
        table.columns,
      );
      const plain = tool.options.filter(
        (field) =>
          field.type === 'column' && field.allowAll !== true && field.allowNone !== true,
      );
      for (const field of plain) {
        expect(['c1', 'c2', 'c3'], `${tool.id}.${field.key}`).toContain(options[field.key]);
      }
      // Two plain column fields on the SAME list, with columns to spare, never name the
      // same one; a field drawn from the second list is a different question.
      const mine = plain
        .filter((field) => field.type === 'column' && field.from !== 'second')
        .map((field) => options[field.key]);
      if (mine.length <= table.columns.length) {
        expect(new Set(mine).size, `${tool.id}`).toBe(mine.length);
      }
    }
  });
});
