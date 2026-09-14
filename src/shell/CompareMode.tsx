import { useState } from 'preact/hooks';
import {
  compareDatasets,
  selectRows,
  toAlignedDataset,
  type CompareStatus,
  type SelectionKind,
} from '../core/compare';
import { makeRow, type Dataset } from '../core/model';
import { addDataset, openDatasets } from '../core/store';
import { ALIGNED_LABELS } from '../tools/compare/compare-lists';
import { en } from '../i18n/en';
import { format } from '../i18n/format';
import { ComparePanel } from './ComparePanel';
import { DataTable } from './DataTable';

type Filter = 'all' | CompareStatus | 'differences';

const FILTERS: Filter[] = ['all', 'match', 'differences', 'only-a', 'only-b', 'count-differs'];
const CREATIONS: SelectionKind[] = ['both', 'only-a', 'only-b', 'union', 'differences'];

interface Props {
  onImport: () => void;
  onClose: () => void;
}

function firstKey(dataset: Dataset | undefined): string {
  return (
    dataset?.columns.find((column) => column.id === 'email')?.id ??
    dataset?.columns[0]?.id ??
    ''
  );
}

/** The one special layout in the shell: two lists side by side, aligned result below. */
export function CompareMode({ onImport, onClose }: Props) {
  const datasets = openDatasets.value;
  const [idA, setIdA] = useState(datasets[0]?.id ?? '');
  const [idB, setIdB] = useState(datasets[1]?.id ?? '');
  const a = datasets.find((dataset) => dataset.id === idA) ?? datasets[0];
  const b = datasets.find((dataset) => dataset.id === idB) ?? datasets[1];

  const [keyA, setKeyA] = useState(firstKey(a));
  const [keyB, setKeyB] = useState(firstKey(b));
  const [normalize, setNormalize] = useState({
    trim: true,
    ignoreCase: true,
    collapseWhitespace: false,
    ignoreDiacritics: false,
  });
  const [filter, setFilter] = useState<Filter>('all');

  if (a === undefined || b === undefined) {
    return (
      <section class="compare">
        <p class="notice">{en.compare.needTwo}</p>
        <button type="button" class="button button--primary" onClick={onImport}>
          {en.toolbar.import}
        </button>
      </section>
    );
  }

  // Bound after the guard above, so the callbacks below need no assertions.
  const listA = a;
  const listB = b;

  const result = compareDatasets(listA, listB, {
    keyA: [listA.columns.some((column) => column.id === keyA) ? keyA : firstKey(listA)],
    keyB: [listB.columns.some((column) => column.id === keyB) ? keyB : firstKey(listB)],
    normalize,
  });

  const shown = result.rows.filter((row) =>
    filter === 'all'
      ? true
      : filter === 'differences'
        ? row.status !== 'match'
        : row.status === filter,
  );
  const table = toAlignedDataset(shown, ALIGNED_LABELS);

  function create(kind: SelectionKind): void {
    const picked = selectRows(result.rows, kind);
    // The new list keeps the shape of whichever side actually contributed rows.
    const source = picked.a.length > 0 || picked.b.length === 0 ? listA : listB;
    const rows = [...picked.a, ...picked.b].map((row, index) => makeRow(index, row.cells));
    addDataset(
      { ...source, rows },
      format(en.compare.newListName, {
        what: en.compare.creations[kind],
        a: listA.name,
        b: listB.name,
      }),
    );
    onClose();
  }

  return (
    <section class="compare">
      <div class="compare__head">
        <h2 class="compare__title">{en.compare.title}</h2>
        <button type="button" class="button button--quiet" onClick={onClose}>
          {en.compare.close}
        </button>
      </div>

      <div class="compare__panels">
        <ComparePanel
          label={en.compare.listA}
          idPrefix="compare-a"
          datasets={datasets}
          selected={listA}
          keyColumn={keyA}
          onSelect={(id) => {
            setIdA(id);
            setKeyA(firstKey(datasets.find((dataset) => dataset.id === id)));
          }}
          onKeyColumn={setKeyA}
          onPaste={onImport}
        />
        <ComparePanel
          label={en.compare.listB}
          idPrefix="compare-b"
          datasets={datasets}
          selected={listB}
          keyColumn={keyB}
          onSelect={(id) => {
            setIdB(id);
            setKeyB(firstKey(datasets.find((dataset) => dataset.id === id)));
          }}
          onKeyColumn={setKeyB}
          onPaste={onImport}
        />
      </div>

      <fieldset class="field field--group">
        <legend class="field__label">{en.compare.matching}</legend>
        <div class="field__choices">
          {(
            [
              ['trim', en.tools.shared.trim],
              ['ignoreCase', en.tools.shared.ignoreCase],
              ['collapseWhitespace', en.tools.collapse.name],
              ['ignoreDiacritics', en.tools.shared.ignoreDiacritics],
            ] as const
          ).map(([key, label]) => (
            <label key={key} class="choice">
              <input
                type="checkbox"
                checked={normalize[key]}
                onChange={(event) =>
                  setNormalize({ ...normalize, [key]: event.currentTarget.checked })
                }
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <p class="notice" role="status">
        {format(en.compare.summary, {
          match: result.stats.match,
          differs: result.stats['count-differs'],
          onlyA: result.stats['only-a'],
          onlyB: result.stats['only-b'],
        })}
      </p>

      <div class="compare__chips" role="group" aria-label={en.compare.filterLabel}>
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            class="chip"
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
          >
            {option === 'all' ? en.compare.filters.all : en.compare.filters[option]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p class="field__help">{en.compare.empty}</p>
      ) : (
        <DataTable columns={table.columns} rows={table.rows} />
      )}

      <div class="compare__create">
        <span class="field__label">{en.compare.create}</span>
        {CREATIONS.map((kind) => (
          <button key={kind} type="button" class="button" onClick={() => create(kind)}>
            {en.compare.creations[kind]}
          </button>
        ))}
      </div>
    </section>
  );
}
