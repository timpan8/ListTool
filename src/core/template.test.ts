import { describe, expect, it } from 'vitest';
import { fillTemplate, placeholdersIn } from './template';
import { makeRow } from './model';
import { tableOf } from '../test/fixtures';

const PEOPLE = tableOf(['first', 'last'], [{ first: 'Anna', last: 'Berg' }]);
const ROW = PEOPLE.rows[0]!;

describe('fillTemplate', () => {
  it('fills a placeholder per column', () => {
    expect(fillTemplate('{first} {last}', ROW, PEOPLE.columns)).toBe('Anna Berg');
  });

  it('fills the same placeholder more than once', () => {
    expect(fillTemplate('{first}{first}', ROW, PEOPLE.columns)).toBe('AnnaAnna');
  });

  it('leaves an unknown placeholder visible, because it is usually a typo', () => {
    expect(fillTemplate('{nope}', ROW, PEOPLE.columns)).toBe('{nope}');
  });

  it('can be told to drop an unknown placeholder instead', () => {
    expect(fillTemplate('[{nope}]', ROW, PEOPLE.columns, false)).toBe('[]');
  });

  it('writes an empty cell as nothing rather than as undefined', () => {
    const row = makeRow(0, { first: 'Anna' });
    expect(fillTemplate('{first}|{last}|', row, PEOPLE.columns)).toBe('Anna||');
  });

  it('leaves text that is not a placeholder alone', () => {
    expect(fillTemplate('{ first }', ROW, PEOPLE.columns)).toBe('{ first }');
    expect(fillTemplate('100 % klart', ROW, PEOPLE.columns)).toBe('100 % klart');
  });

  it('returns a template with no placeholders unchanged', () => {
    expect(fillTemplate('hej', ROW, PEOPLE.columns)).toBe('hej');
  });
});

describe('placeholdersIn', () => {
  it('lists the placeholders in the order they appear', () => {
    expect(placeholdersIn('{last}, {first}')).toEqual(['last', 'first']);
  });

  it('lists a repeated placeholder once', () => {
    expect(placeholdersIn('{a}{b}{a}')).toEqual(['a', 'b']);
  });

  it('finds none in plain text', () => {
    expect(placeholdersIn('no placeholders here')).toEqual([]);
  });
});
