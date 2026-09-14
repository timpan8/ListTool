import { describe, expect, it } from 'vitest';
import { templateExporter } from './template';
import { listOf, tableOf } from '../test/fixtures';

const DEFAULTS = { row: '{value}', between: '\n', before: '', after: '', unknown: true };

const PEOPLE = tableOf(
  ['first', 'email'],
  [
    { first: 'Anna', email: 'anna@example.com' },
    { first: 'Bo', email: 'bo@example.com' },
  ],
);

describe('template exporter', () => {
  it('writes one line per row from the template', () => {
    expect(templateExporter.render(listOf('a', 'b'), DEFAULTS)).toBe('a\nb');
  });

  it('fills a placeholder per column', () => {
    const text = templateExporter.render(PEOPLE, {
      ...DEFAULTS,
      row: 'Hej {first}, vi mailar dig på {email}.',
    });
    expect(text).toBe(
      'Hej Anna, vi mailar dig på anna@example.com.\nHej Bo, vi mailar dig på bo@example.com.',
    );
  });

  it('uses the same placeholder more than once', () => {
    expect(templateExporter.render(listOf('a'), { ...DEFAULTS, row: '{value}={value}' })).toBe(
      'a=a',
    );
  });

  it('leaves an unknown placeholder visible, because it is usually a typo', () => {
    expect(templateExporter.render(listOf('a'), { ...DEFAULTS, row: '{nope}' })).toBe('{nope}');
  });

  it('can be told to drop an unknown placeholder instead', () => {
    expect(
      templateExporter.render(listOf('a'), { ...DEFAULTS, row: '[{nope}]', unknown: false }),
    ).toBe('[]');
  });

  it('writes a header and a footer around the rows', () => {
    const text = templateExporter.render(listOf('a', 'b'), {
      ...DEFAULTS,
      row: '  <li>{value}</li>',
      before: '<ul>',
      after: '</ul>',
    });
    expect(text).toBe('<ul>\n  <li>a</li>\n  <li>b</li>\n</ul>');
  });

  it('joins the rows with whatever separator was chosen', () => {
    expect(templateExporter.render(listOf('a', 'b'), { ...DEFAULTS, between: ', ' })).toBe('a, b');
  });

  it('writes an empty cell as nothing rather than as undefined', () => {
    const dataset = tableOf(['a', 'b'], [{ a: 'x', b: '' }]);
    expect(templateExporter.render(dataset, { ...DEFAULTS, row: '{a}|{b}|' })).toBe('x||');
  });

  it('handles an empty list', () => {
    expect(templateExporter.render(listOf(), DEFAULTS)).toBe('');
    expect(
      templateExporter.render(listOf(), { ...DEFAULTS, before: '<ul>', after: '</ul>' }),
    ).toBe('<ul>\n</ul>');
  });

  it('leaves text that is not a placeholder alone', () => {
    expect(templateExporter.render(listOf('a'), { ...DEFAULTS, row: '{ value }' })).toBe(
      '{ value }',
    );
  });

  it('never mutates the dataset it renders', () => {
    const before = JSON.stringify(PEOPLE);
    templateExporter.render(PEOPLE, { ...DEFAULTS, row: '{first}' });
    expect(JSON.stringify(PEOPLE)).toBe(before);
  });
});
