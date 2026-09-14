import { describe, expect, it } from 'vitest';
import { extractPatternTool } from './extract-pattern';
import { cell } from '../../core/model';
import { listOf, tableOf } from '../../test/fixtures';

function extracted(input: string[], options: Record<string, unknown>, columnId: string) {
  return extractPatternTool
    .run(listOf(...input), options)
    .output.rows.map((row) => cell(row, columnId));
}

describe('extract pattern', () => {
  it('pulls the email out of a longer value', () => {
    expect(extracted(['Anna <anna@example.com>'], { preset: 'email' }, 'email')).toEqual([
      'anna@example.com',
    ]);
  });

  it('pulls the domain, not the whole address', () => {
    expect(extracted(['anna@example.com'], { preset: 'domain' }, 'domain')).toEqual([
      'example.com',
    ]);
  });

  it('leaves the cell empty when there is no match', () => {
    expect(extracted(['no address here'], { preset: 'email' }, 'email')).toEqual(['']);
  });

  it('keeps only the first match by default', () => {
    expect(
      extracted(['a@example.com and b@example.com'], { preset: 'email' }, 'email'),
    ).toEqual(['a@example.com']);
  });

  it('joins every match when asked', () => {
    expect(
      extracted(
        ['a@example.com and b@example.com'],
        { preset: 'email', allMatches: true },
        'email',
      ),
    ).toEqual(['a@example.com, b@example.com']);
  });

  it('uses a custom regular expression', () => {
    expect(extracted(['order 1234 shipped'], { preset: 'regex', regex: '\\d+' }, 'match')).toEqual(
      ['1234'],
    );
  });

  it('warns and changes nothing on a broken pattern', () => {
    const result = extractPatternTool.run(listOf('a'), { preset: 'regex', regex: '[' });
    expect(result.warnings?.[0]).toContain('not a valid regular expression');
    expect(result.output.columns).toHaveLength(1);
  });

  it('does nothing when a custom pattern is empty', () => {
    expect(extractPatternTool.run(listOf('a'), { preset: 'regex', regex: '' }).summary).toBe(
      'Nothing changed.',
    );
  });

  it('adds the new column at the end and keeps the old ones', () => {
    const output = extractPatternTool.run(listOf('a@example.com'), { preset: 'email' }).output;
    expect(output.columns.map((column) => column.id)).toEqual(['value', 'email']);
  });

  it('does not collide with a column that is already called email', () => {
    const table = tableOf(['email'], [{ email: 'Anna <a@example.com>' }]);
    const output = extractPatternTool.run(table, { column: 'email', preset: 'email' }).output;
    expect(output.columns.map((column) => column.id)).toEqual(['email', 'email2']);
    expect(cell(output.rows[0]!, 'email')).toBe('Anna <a@example.com>');
    expect(cell(output.rows[0]!, 'email2')).toBe('a@example.com');
  });

  it('counts the rows where it found something', () => {
    expect(
      extractPatternTool.run(listOf('a@example.com', 'nothing'), { preset: 'email' }).summary,
    ).toBe('Extracted 1 value into Email');
  });
});

describe('the rest of the presets', () => {
  function first(value: string, preset: string, columnId: string): string {
    const output = extractPatternTool.run(listOf(value), { preset }).output;
    return cell(output.rows[0]!, columnId);
  }

  it('extracts a URL', () => {
    expect(first('see https://example.com/a?b=1 now', 'url', 'url')).toBe(
      'https://example.com/a?b=1',
    );
  });

  it('extracts an IPv4 address and rejects an impossible one', () => {
    expect(first('host 192.168.1.20 up', 'ipv4', 'ipv4')).toBe('192.168.1.20');
    expect(first('999.1.1.1', 'ipv4', 'ipv4')).not.toBe('999.1.1.1');
  });

  it('extracts an IPv6 address', () => {
    expect(first('addr 2001:db8::1 end', 'ipv6', 'ipv6')).toBe('2001:db8::1');
  });

  it('extracts a GUID', () => {
    expect(first('id 3f2504e0-4f89-11d3-9a0c-0305e82c3301!', 'guid', 'guid')).toBe(
      '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
    );
  });

  it('extracts a number, including a negative and a decimal', () => {
    expect(first('order -12.5 shipped', 'number', 'number')).toBe('-12.5');
  });
});

describe('the IPv6 preset', () => {
  function first(value: string): string {
    const output = extractPatternTool.run(listOf(value), { preset: 'ipv6' }).output;
    return cell(output.rows[0]!, 'ipv6');
  }

  it('takes the whole compressed address, not just the prefix', () => {
    expect(first('2001:db8::1')).toBe('2001:db8::1');
  });

  it('takes a fully written address', () => {
    expect(first('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(
      '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
    );
  });

  it('takes a leading-compressed address', () => {
    expect(first('::1')).toBe('::1');
  });

  it('does not mistake a clock time for an address', () => {
    expect(first('meeting at 12:30')).toBe('');
  });
});
