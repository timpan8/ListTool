import { useMemo, useState } from 'preact/hooks';
import { compareDatasets, sideBySide } from '../core/compare';
import { defaultOptions, type Options } from '../core/registry';
import { sortOptionsOf } from '../core/settings';
import { openDatasets, settings } from '../core/store';
import { sorted, type ViewSort } from '../core/view';
import { compareListsTool } from '../tools/compare/compare-lists';
import { compareLabels, readCompareOptions } from '../tools/compare/shared';
import { ui } from '../i18n';
import { CompareActions } from './CompareActions';
import { CompareHeader } from './CompareHeader';
import { CompareResult, passesFilter, type CompareFilter } from './CompareResult';
import { withColumnDefaults } from './toolOptions';

interface Props {
  onImport: () => void;
  onClose: () => void;
}

/**
 * The one special layout in the shell: two lists side by side, and below them the
 * Compare tool's own result — one row per key, both lists' columns beside each other,
 * the cells that differ marked. Everything here is the compare-lists tool's form and
 * output; the mode only holds which lists, which filter and which order.
 */
export function CompareMode({ onImport, onClose }: Props) {
  const datasets = openDatasets.value;
  const [idA, setIdA] = useState(datasets[0]?.id ?? '');
  const [idB, setIdB] = useState(datasets[1]?.id ?? '');
  const [options, setOptions] = useState<Options>(() => defaultOptions(compareListsTool.options));
  const [filter, setFilter] = useState<CompareFilter>('all');
  const [sort, setSort] = useState<ViewSort | null>(null);
  const a = datasets.find((dataset) => dataset.id === idA) ?? datasets[0];
  const b = datasets.find((dataset) => dataset.id === idB) ?? datasets[1];

  const outcome = useMemo(() => {
    if (a === undefined || b === undefined) return null;
    const chosen = withColumnDefaults(compareListsTool.options, options, a.columns, b.columns);
    const compare = readCompareOptions(chosen, a, b);
    const result = compareDatasets(a, b, compare);
    const side = sideBySide(result, a, b, compareLabels(a, b), compare.normalize);
    return { chosen, result, side };
  }, [a, b, options]);

  if (a === undefined || b === undefined || outcome === null) {
    return (
      <section class="compare">
        <p class="notice">{ui.compare.needTwo}</p>
        <button type="button" class="button button--primary" onClick={onImport}>
          {ui.toolbar.import}
        </button>
      </section>
    );
  }

  const { chosen, result, side } = outcome;
  const shown = sorted(
    side.dataset.rows.filter((row) => passesFilter(filter, side.statusOf.get(row.id))),
    sort,
    sortOptionsOf(settings.value),
  );

  function toggleSort(columnId: string): void {
    if (sort === null || sort.columnId !== columnId) setSort({ columnId, direction: 'asc' });
    else if (sort.direction === 'asc') setSort({ columnId, direction: 'desc' });
    else setSort(null);
  }

  return (
    <section class="compare">
      <CompareHeader
        a={a}
        b={b}
        datasets={datasets}
        options={chosen}
        onPick={(which, id) => (which === 'a' ? setIdA(id) : setIdB(id))}
        onSwap={() => {
          setIdA(b.id);
          setIdB(a.id);
          setOptions({ ...options, keyA: chosen['keyB'], keyB: chosen['keyA'] });
        }}
        onChange={(key, value) => setOptions({ ...options, [key]: value })}
        onImport={onImport}
        onClose={onClose}
      />

      <CompareResult
        a={a}
        b={b}
        result={result}
        side={side}
        rows={shown}
        filter={filter}
        onFilter={setFilter}
        sort={sort}
        onSort={toggleSort}
      />

      <CompareActions a={a} b={b} result={result} side={side} shown={shown} onCreated={onClose} />
    </section>
  );
}
