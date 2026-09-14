import { cell } from '../../core/model';
import { clusterValues } from '../../core/similarity';
import { normalizeKey } from '../../core/normalize';
import { booleanOption, numberOption, type Tool } from '../../core/registry';
import { en } from '../../i18n/en';
import { format, plural } from '../../i18n/format';
import { freeColumnId, targetColumn, withColumns } from '../helpers';

const strings = en.tools.findSimilar;

const DEFAULT_THRESHOLD = 90;
const NORMALIZE = { trim: true, ignoreCase: true };

export const findSimilarTool: Tool = {
  id: 'find-similar',
  name: strings.name,
  category: 'clean',
  description: strings.description,
  keywords: ['similar', 'fuzzy', 'near', 'almost', 'typo', 'cluster', 'duplicate', 'misspelling'],
  arity: 'single',
  options: [
    { key: 'column', label: en.tools.shared.column, type: 'column' },
    {
      key: 'threshold',
      label: strings.threshold,
      type: 'number',
      default: DEFAULT_THRESHOLD,
      help: strings.thresholdHelp,
    },
    { key: 'onlyGroups', label: strings.onlyGroups, type: 'boolean', default: false },
  ],
  run(input, options) {
    const source = targetColumn(input, options);
    if (source === undefined) return { output: input, summary: en.tools.nothingChanged };

    // A percentage in the form, a fraction in the maths. 100 means exact.
    const threshold = Math.min(100, Math.max(0, numberOption(options, 'threshold', DEFAULT_THRESHOLD))) / 100;

    // Clustered on distinct values: a list of 5 000 rows usually holds far fewer names,
    // and comparing each row against each row would be the slow way to the same answer.
    const display = new Map<string, string>();
    for (const row of input.rows) {
      const value = cell(row, source.id);
      const key = normalizeKey(value, NORMALIZE);
      if (!display.has(key)) display.set(key, value);
    }

    const clusters = clusterValues([...display.keys()], threshold);
    const groupOf = new Map<string, number>();
    const suggestionOf = new Map<string, string>();
    clusters.forEach((cluster, index) => {
      const representative = display.get(cluster.representative) ?? cluster.representative;
      for (const key of cluster.values) {
        groupOf.set(key, index + 1);
        suggestionOf.set(key, representative);
      }
    });

    const interesting = new Set(
      clusters.filter((cluster) => cluster.values.length > 1).map((cluster) => cluster.representative),
    );
    if (interesting.size === 0) {
      return { output: input, summary: en.tools.nothingChanged, warnings: [strings.none] };
    }

    const groupId = freeColumnId(input, 'group');
    const suggestedId = freeColumnId(
      { ...input, columns: [...input.columns, { id: groupId, name: '' }] },
      'suggested',
    );

    const keyOfCluster = new Map<string, string>();
    for (const cluster of clusters) {
      for (const key of cluster.values) keyOfCluster.set(key, cluster.representative);
    }

    const onlyGroups = booleanOption(options, 'onlyGroups', false);
    const rows = input.rows
      .filter(
        (row) =>
          !onlyGroups ||
          interesting.has(keyOfCluster.get(normalizeKey(cell(row, source.id), NORMALIZE)) ?? ''),
      )
      .map((row) => {
        const key = normalizeKey(cell(row, source.id), NORMALIZE);
        return {
          id: row.id,
          cells: {
            ...row.cells,
            [groupId]: String(groupOf.get(key) ?? 0),
            [suggestedId]: suggestionOf.get(key) ?? '',
          },
        };
      });

    return {
      // Nothing is replaced: this reports, and the ordinary Find & replace acts on it.
      output: withColumns(
        input,
        [
          ...input.columns,
          { id: groupId, name: strings.groupColumn },
          { id: suggestedId, name: strings.suggestionColumn },
        ],
        rows,
      ),
      summary: format(strings.summary, { groups: plural(interesting.size, strings.groups) }),
      stats: { groups: interesting.size, clusters: clusters.length },
    };
  },
};
