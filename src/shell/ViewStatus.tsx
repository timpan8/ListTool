import type { Dataset } from '../core/model';
import {
  activeView,
  selectedRows,
  settings,
  setViewFilter,
  setViewSort,
  viewFilter,
  viewSort,
} from '../core/store';
import { en } from '../i18n/en';
import { format } from '../i18n/format';
import { makeSortPermanent } from './columnActions';
import type { PanelIntent } from './panelIntent';
import { SelectionActions } from './SelectionActions';

interface Props {
  dataset: Dataset;
  onIntent: (intent: PanelIntent) => void;
}

/**
 * What the view is doing that the list is not: a filter, an order, a set of ticks. Each
 * strip says so in words and offers the way out — or, for the order, the way to make it
 * the list's own.
 */
export function ViewStatus({ dataset, onIntent }: Props) {
  const filter = viewFilter.value;
  const sort = viewSort.value;
  const ticked = selectedRows.value;
  const filtered = dataset.columns.find((column) => column.id === filter?.columnId);
  const sortedOn = dataset.columns.find((column) => column.id === sort?.columnId);

  return (
    <>
      {filter !== null && filtered !== undefined ? (
        <p class="view__selection" role="status">
          {format(
            filter.mode === 'contains'
              ? en.profile.filteringContains
              : filter.value === ''
                ? en.profile.filteringBlank
                : en.profile.filtering,
            { column: filtered.name, value: filter.value },
          )}
          <button type="button" class="button button--quiet" onClick={() => setViewFilter(null)}>
            {en.profile.clearFilter}
          </button>
          <span class="field__help">{en.profile.filterHint}</span>
        </p>
      ) : null}

      {sort !== null && sortedOn !== undefined ? (
        <p class="view__selection" role="status">
          {format(en.view.sortedBy, {
            column: sortedOn.name,
            direction: sort.direction === 'desc' ? en.view.sortDesc : en.view.sortAsc,
          })}
          <button type="button" class="button button--quiet" onClick={() => setViewSort(null)}>
            {en.view.clearSort}
          </button>
          <button
            type="button"
            class="button button--quiet"
            onClick={() => {
              // The order becomes a step; the view then has nothing left to add.
              if (makeSortPermanent(dataset, activeView.value, settings.value)) setViewSort(null);
            }}
          >
            {en.view.makePermanent}
          </button>
          <span class="field__help">{en.view.sortHint}</span>
        </p>
      ) : null}

      {ticked.length > 0 ? (
        <SelectionActions dataset={dataset} ticked={ticked} onIntent={onIntent} />
      ) : null}
    </>
  );
}
