import { cell, type Row } from '../../core/model';
import { clusterValues } from '../../core/similarity';
import { normalizeKey } from '../../core/normalize';
import { booleanOption, numberOption, type Tool } from '../../core/registry';
import { ui } from '../../i18n';
import { format, plural } from '../../i18n/format';
import {
  freeColumnId,
  NORMALIZE_FIELDS,
  readNormalize,
  targetColumn,
  withColumns,
} from '../helpers';

const strings = ui.tools.findSimilar;

const DEFAULT_THRESHOLD = 90;

/**
 * Clustering compares each value with every cluster so far, so the cost grows with the
 * square of the distinct values. Past this many it would take longer than a person waits.
 */
export const MAX_DISTINCT = 5000;

export const findSimilarTool: Tool = {
  id: 'find-similar',
  name: strings.name,
  category: 'clean',
  description: strings.description,
  keywords: ['similar', 'fuzzy', 'near', 'almost', 'typo', 'cluster', 'duplicate', 'misspelling'],
  arity: 'single',
  options: [
    { key: 'column', label: ui.tools.shared.column, type: 'column' },
    {
      key: 'threshold',
      label: strings.threshold,
      type: 'number',
      default: DEFAULT_THRESHOLD,
      help: strings.thresholdHelp,
    },
    { key: 'onlyGroups', label: strings.onlyGroups, type: 'boolean', default: false },
    ...NORMALIZE_FIELDS,
  ],
  run(input, options) {
    const source = targetColumn(input, options);
    if (source === undefined) return { output: input, summary: ui.tools.nothingChanged };

    // A percentage in the form, a fraction in the maths. 100 means exact.
    const threshold = Math.min(100, Math.max(0, numberOption(options, 'threshold', DEFAULT_THRESHOLD))) / 100;
    const normalize = readNormalize(options);

    // Clustered on distinct values: a list of 5 000 rows usually holds far fewer names,
    // and comparing each row against each row would be the slow way to the same answer.
    const display = new Map<string, string>();
    const keys = input.rows.map((row) => {
      const value = cell(row, source.id);
      const key = normalizeKey(value, normalize);
      if (!display.has(key)) display.set(key, value);
      return key;
    });

    if (display.size > MAX_DISTINCT) {
      return {
        output: input,
        summary: ui.tools.nothingChanged,
        warnings: [format(strings.tooMany, { n: display.size, limit: MAX_DISTINCT })],
      };
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
      return { output: input, summary: ui.tools.nothingChanged, warnings: [strings.none] };
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
    const rows: Row[] = [];
    input.rows.forEach((row, index) => {
      const key = keys[index] ?? '';
      if (onlyGroups && !interesting.has(keyOfCluster.get(key) ?? '')) return;
      rows.push({
        id: row.id,
        cells: {
          ...row.cells,
          [groupId]: String(groupOf.get(key) ?? 0),
          [suggestedId]: suggestionOf.get(key) ?? '',
        },
      });
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
