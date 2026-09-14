import { describe, expect, it } from 'vitest';
import { renameColumnTool } from './rename-column';
import { listOf } from '../../test/fixtures';

describe('rename column', () => {
  it('changes the name', () => {
    const output = renameColumnTool.run(listOf('a'), { column: 'value', name: 'Email' }).output;
    expect(output.columns[0]?.name).toBe('Email');
  });

  it('keeps the id, which is what recipes reference', () => {
    const output = renameColumnTool.run(listOf('a'), { column: 'value', name: 'Email' }).output;
    expect(output.columns[0]?.id).toBe('value');
  });

  it('keeps the rows untouched', () => {
    const output = renameColumnTool.run(listOf('a', 'b'), { name: 'Email' }).output;
    expect(output.rows).toHaveLength(2);
  });

  it('warns when no name is given', () => {
    const result = renameColumnTool.run(listOf('a'), { name: '   ' });
    expect(result.warnings?.[0]).toBe('Type a new name first.');
    expect(result.output.columns[0]?.name).toBe('Value');
  });

  it('reports the rename', () => {
    expect(renameColumnTool.run(listOf('a'), { name: 'Email' }).summary).toBe(
      'Renamed Value to Email',
    );
  });
});
