import { describe, expect, it } from 'vitest';
import { quotedJoinExporter } from './quoted-join';
import { valuesDataset } from '../core/model';

const parseRef = { parserId: 'lines', options: {} };
const list = valuesDataset(['a', 'b', 'c'], 'Value', '', parseRef);

describe('quoted list exporter', () => {
  it('produces a SQL-ready quoted list', () => {
    expect(quotedJoinExporter.render(list, {})).toBe("'a','b','c'");
  });

  it('honours a different quote character', () => {
    expect(quotedJoinExporter.render(list, { quote: '"' })).toBe('"a","b","c"');
  });

  it('honours a different separator', () => {
    expect(quotedJoinExporter.render(list, { separator: ', ' })).toBe("'a', 'b', 'c'");
  });

  it('doubles a quote inside a value so the statement stays valid', () => {
    const names = valuesDataset(["O'Brien"], 'Value', '', parseRef);
    expect(quotedJoinExporter.render(names, {})).toBe("'O''Brien'");
  });

  it('leaves values alone when the quote character is emptied', () => {
    expect(quotedJoinExporter.render(list, { quote: '' })).toBe('a,b,c');
  });

  it('is empty for an empty list', () => {
    expect(quotedJoinExporter.render(valuesDataset([], 'Value', '', parseRef), {})).toBe('');
  });

  it('quotes an empty value rather than dropping it', () => {
    const withBlank = valuesDataset(['a', ''], 'Value', '', parseRef);
    expect(quotedJoinExporter.render(withBlank, {})).toBe("'a',''");
  });
});
