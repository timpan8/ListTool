import type { CompareResult as Outcome, CompareStatus, SideBySide } from '../core/compare';
import type { Dataset, Row } from '../core/model';
import { numericColumns } from '../core/profile';
import type { ViewSort } from '../core/view';
import { en } from '../i18n/en';
import { format, plural } from '../i18n/format';
import { DataTable } from './DataTable';
import type { Marks } from './marks';

export type CompareFilter = 'all' | CompareStatus | 'differences';

export const FILTERS: CompareFilter[] = [
  'all',
  'match',
  'differences',
  'only-a',
  'only-b',
  'count-differs',
];

/** Does a row of this status belong under this filter? */
export function passesFilter(filter: CompareFilter, status: CompareStatus | undefined): boolean {
  if (status === undefined) return false;
  if (filter === 'all') return true;
  if (filter === 'differences') return status !== 'match';
  return status === filter;
}

const NO_ROWS: ReadonlySet<string> = new Set();

interface Props {
  a: Dataset;
  b: Dataset;
  result: Outcome;
  side: SideBySide;
  /** The rows under the current filter, in the current order. */
  rows: Row[];
  filter: CompareFilter;
  onFilter: (filter: CompareFilter) => void;
  sort: ViewSort | null;
  onSort: (columnId: string) => void;
}

/** The outcome in words with the lists' names, the filter chips, and the table itself. */
export function CompareResult({ a, b, result, side, rows, filter, onFilter, sort, onSort }: Props) {
  const names = { a: a.name, b: b.name };
  const differing = side.changedCells.size / 2;
  const marks: Marks = {
    cells: side.changedCells,
    rows: NO_ROWS,
    columns: NO_ROWS,
    labels: { cell: en.compare.differs, row: '', column: '' },
  };

  return (
    <>
      <p class="notice" role="status">
        {format(en.compare.summary, {
          ...names,
          match: result.stats.match,
          differs: result.stats['count-differs'],
          onlyA: result.stats['only-a'],
          onlyB: result.stats['only-b'],
        })}
        {differing > 0 ? ` · ${plural(differing, en.compare.differing)}` : ''}
      </p>

      <div class="compare__chips" role="group" aria-label={en.compare.filterLabel}>
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            class="chip"
            aria-pressed={filter === option}
            onClick={() => onFilter(option)}
          >
            {format(en.compare.filters[option], names)}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p class="field__help">{en.compare.empty}</p>
      ) : (
        <DataTable
          columns={side.dataset.columns}
          rows={rows}
          groups={side.groups}
          marks={marks}
          numeric={numericColumns(side.dataset)}
          sort={sort}
          onSort={onSort}
          rowClass={(row) => {
            const status = side.statusOf.get(row.id);
            return status === undefined ? undefined : `is-${status}`;
          }}
        />
      )}
    </>
  );
}
