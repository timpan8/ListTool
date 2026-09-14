import { describe, expect, it } from 'vitest';
import { buildCommands, fuzzyScore, searchCommands } from './commands';
import { listOf, tableOf } from '../test/fixtures';

const handlers = { pickTool: () => {}, reparse: () => {}, copyAs: () => {} };

describe('buildCommands', () => {
  it('offers every applicable tool, re-parse and copy-as', () => {
    const commands = buildCommands(listOf('a'), handlers);
    expect(commands.some((command) => command.id === 'tool:sort')).toBe(true);
    expect(commands.some((command) => command.id === 'parse:lines')).toBe(true);
    expect(commands.some((command) => command.id === 'copy:csv')).toBe(true);
  });

  it('hides a tool that does not fit the list', () => {
    const commands = buildCommands(listOf('a'), handlers);
    expect(commands.some((command) => command.id === 'tool:swap-columns')).toBe(false);
  });

  it('offers a column tool on a table', () => {
    const commands = buildCommands(tableOf(['a', 'b'], [{ a: 'x', b: 'y' }]), handlers);
    expect(commands.some((command) => command.id === 'tool:swap-columns')).toBe(true);
  });

  it('offers nothing without a list', () => {
    expect(buildCommands(null, handlers)).toEqual([]);
  });

  it('leaves out re-parse when there is no original input', () => {
    const noRaw = { ...listOf('a') };
    delete noRaw.rawInput;
    expect(buildCommands(noRaw, handlers).some((c) => c.id.startsWith('parse:'))).toBe(false);
  });
});

describe('fuzzyScore', () => {
  it('scores a direct hit by where it starts', () => {
    expect(fuzzyScore('sort', 'Sort')).toBe(0);
    expect(fuzzyScore('duplicates', 'Remove duplicates')).toBe(7);
  });

  it('matches scattered letters, but ranks them below direct hits', () => {
    const scattered = fuzzyScore('rmdp', 'Remove duplicates');
    expect(scattered).not.toBeNull();
    expect(scattered!).toBeGreaterThan(999);
  });

  it('rejects letters that are not there in order', () => {
    expect(fuzzyScore('zzz', 'Sort')).toBeNull();
    expect(fuzzyScore('tros', 'Sort')).toBeNull();
  });

  it('ignores case', () => {
    expect(fuzzyScore('SORT', 'sort')).toBe(0);
  });

  it('treats an empty query as a match for everything', () => {
    expect(fuzzyScore('', 'anything')).toBe(0);
  });
});

describe('searchCommands', () => {
  const commands = buildCommands(listOf('a'), handlers);

  it('puts the earliest match first when several tools share a word', () => {
    const found = searchCommands(commands, 'duplicates').map((command) => command.id);
    // "Find duplicates" has it at index 5, "Remove duplicates" at index 7.
    expect(found.slice(0, 2)).toEqual(['tool:find-duplicates', 'tool:remove-duplicates']);
  });

  it('finds a parser by name', () => {
    expect(searchCommands(commands, 'csv').some((c) => c.id === 'parse:csv')).toBe(true);
  });

  it('returns everything for an empty query', () => {
    expect(searchCommands(commands, '')).toHaveLength(commands.length);
  });

  it('returns nothing when nothing matches', () => {
    expect(searchCommands(commands, 'qqqq')).toEqual([]);
  });
});
