import { describe, expect, it } from 'vitest';
import { joinedLineExporter } from './joined-line';
import { valuesDataset } from '../core/model';

const parseRef = { parserId: 'lines', options: {} };
const list = valuesDataset(['a', 'b', 'c'], 'Value', '', parseRef);

describe('joined line exporter', () => {
  it('joins with a comma and a space by default', () => {
    expect(joinedLineExporter.render(list, {})).toBe('a, b, c');
  });

  it('uses the delimiter it is given', () => {
    expect(joinedLineExporter.render(list, { delimiter: ';' })).toBe('a;b;c');
  });

  it('can join with a newline', () => {
    expect(joinedLineExporter.render(list, { delimiter: '\n' })).toBe('a\nb\nc');
  });

  it('is empty for an empty list', () => {
    expect(joinedLineExporter.render(valuesDataset([], 'Value', '', parseRef), {})).toBe('');
  });

  it('writes a single value with no delimiter at all', () => {
    expect(joinedLineExporter.render(valuesDataset(['only'], 'Value', '', parseRef), {})).toBe(
      'only',
    );
  });
});
