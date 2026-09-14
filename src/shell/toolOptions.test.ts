import { describe, expect, it } from 'vitest';
import { startingOptions, withSelection } from './toolOptions';
import { DEFAULT_SETTINGS } from '../core/settings';
import type { OptionField, Tool } from '../core/registry';
import { toolById, tools } from '../tools';

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
