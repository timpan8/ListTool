import { describe, expect, it } from 'vitest';
import { sqlInExporter } from './sql-in';
import { listOf } from '../test/fixtures';

describe('sql IN exporter', () => {
  it('writes a parenthesised list', () => {
    expect(sqlInExporter.render(listOf('a', 'b'), {})).toBe("('a', 'b')");
  });

  it('doubles a quote so the statement stays valid', () => {
    expect(sqlInExporter.render(listOf("O'Brien"), {})).toBe("('O''Brien')");
  });

  it('writes empty parentheses for an empty list', () => {
    expect(sqlInExporter.render(listOf(), {})).toBe('()');
  });
});
