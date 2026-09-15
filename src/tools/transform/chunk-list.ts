import { numberOption, stringOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { rowsPhrase, withRows } from '../helpers';

const strings = en.tools.chunk;

const DEFAULT_SIZE = 100;
const DEFAULT_PATTERN = '{name} {n}';

export const chunkListTool: Tool = {
  id: 'chunk-list',
  name: strings.name,
  category: 'transform',
  description: strings.description,
  keywords: ['chunk', 'batch', 'split', 'paginate', 'slice', 'limit', 'portions'],
  arity: 'single',
  options: [
    { key: 'size', label: strings.size, type: 'number', default: DEFAULT_SIZE },
    {
      key: 'pattern',
      label: strings.pattern,
      type: 'text',
      default: DEFAULT_PATTERN,
      help: strings.nameHelp,
    },
  ],
  run(input, options) {
    const size = Math.floor(numberOption(options, 'size', DEFAULT_SIZE));
    if (size < 1) {
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.needSize] };
    }
    if (input.rows.length <= size) {
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.alreadyShort] };
    }

    const pattern = stringOption(options, 'pattern', DEFAULT_PATTERN);
    const batches = [];
    for (let start = 0; start < input.rows.length; start += size) {
      batches.push(input.rows.slice(start, start + size));
    }

    // A batch is the same rows in the same shape, so they keep their ids.
    const asDataset = (rows: typeof input.rows) => withRows(input, rows);

    // The first batch replaces the list in place; the rest open as further tabs, so the
    // whole split is one undoable action rather than a dozen manual ones.
    const [first, ...rest] = batches;

    return {
      output: asDataset(first ?? []),
      summary: format(strings.summary, {
        rows: rowsPhrase(input.rows.length),
        batches: plural(batches.length, strings.batches),
      }),
      stats: { batches: batches.length, size },
      extraLists: rest.map((rows, index) => ({
        name: format(pattern, { name: input.name, n: index + 2 }),
        dataset: asDataset(rows),
      })),
    };
  },
};
