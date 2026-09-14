import { describe, expect, it } from 'vitest';
import { powershellExporter } from './powershell';
import { listOf } from '../test/fixtures';

describe('powershell exporter', () => {
  it('writes a PowerShell array', () => {
    expect(powershellExporter.render(listOf('a', 'b'), {})).toBe("@('a', 'b')");
  });

  it('doubles a quote inside a value', () => {
    expect(powershellExporter.render(listOf("O'Brien"), {})).toBe("@('O''Brien')");
  });

  it('writes an empty array for an empty list', () => {
    expect(powershellExporter.render(listOf(), {})).toBe('@()');
  });

  it('is clipboard text, with no file extension', () => {
    expect(powershellExporter.extension).toBeUndefined();
  });
});
