import { useState } from 'preact/hooks';
import type { Dataset } from '../core/model';
import {
  selectColumn,
  selectedColumn,
  selectedRows,
  selectRows,
  setViewFilter,
  toggleRow,
  viewFilter,
} from '../core/store';
import { visibleRows } from '../core/view';
import { en } from '../i18n/en';
import { format, plural } from '../i18n/format';
import { DataTable } from './DataTable';
import { editCell } from './edits';

interface Props {
  dataset: Dataset;
  onReparse: () => void;
}

/** Raw | Table, plus a search box that filters the VIEW and never the list. */
export function DatasetView({ dataset, onReparse }: Props) {
  const [mode, setMode] = useState<'table' | 'raw'>('table');
  const [query, setQuery] = useState('');
  const filter = viewFilter.value;
  const rows = visibleRows(dataset, query, filter);
  const ticked = selectedRows.value;
  const filtered = dataset.columns.find((column) => column.id === filter?.columnId);

  return (
    <section class="view">
      <div class="view__bar">
        <div class="segmented" role="group" aria-label={en.view.modeLabel}>
          <button
            type="button"
            class="segmented__button"
            aria-pressed={mode === 'raw'}
            onClick={() => setMode('raw')}
          >
            {en.view.raw}
          </button>
          <button
            type="button"
            class="segmented__button"
            aria-pressed={mode === 'table'}
            onClick={() => setMode('table')}
          >
            {en.view.table}
          </button>
        </div>

        {mode === 'table' ? (
          <label class="view__search">
            <span class="visually-hidden">{en.view.searchLabel}</span>
            <input
              type="search"
              placeholder={en.view.search}
              value={query}
              onInput={(event) => setQuery(event.currentTarget.value)}
            />
          </label>
        ) : (
          <button type="button" class="button" onClick={onReparse}>
            {en.view.reparse}
          </button>
        )}

        <p class="view__count">
          {format(en.view.showing, { shown: rows.length, total: dataset.rows.length })}
        </p>
      </div>

      {mode === 'table' && filtered !== undefined && filter !== null ? (
        <p class="view__selection" role="status">
          {format(filter.value === '' ? en.profile.filteringBlank : en.profile.filtering, {
            column: filtered.name,
            value: filter.value,
          })}
          <button
            type="button"
            class="button button--quiet"
            onClick={() => setViewFilter(null)}
          >
            {en.profile.clearFilter}
          </button>
          <span class="field__help">{en.profile.filterHint}</span>
        </p>
      ) : null}

      {mode === 'table' && ticked.length > 0 ? (
        <p class="view__selection" role="status">
          {plural(ticked.length, en.view.selection)}
          <button type="button" class="button button--quiet" onClick={() => selectRows([])}>
            {en.view.clearSelection}
          </button>
          <span class="field__help">{en.view.selectionHint}</span>
        </p>
      ) : null}

      {mode === 'raw' ? (
        <div class="raw">
          <h2 class="visually-hidden">{en.view.rawLabel}</h2>
          {dataset.rawInput === undefined ? (
            <p class="field__help">{en.view.rawMissing}</p>
          ) : (
            <pre class="raw__text">{dataset.rawInput}</pre>
          )}
        </div>
      ) : rows.length === 0 ? (
        <p class="view__empty">{format(en.view.noMatches, { query })}</p>
      ) : (
        <>
          <DataTable
            columns={dataset.columns}
            rows={rows}
            selected={selectedColumn.value}
            onSelect={selectColumn}
            showRowNumbers
            ticked={ticked}
            onTick={toggleRow}
            // "Every row" means every row on screen: the search filters the view, and a
            // tick you cannot see is a tick you did not mean.
            onTickAll={(checked) => selectRows(checked ? rows.map((row) => row.id) : [])}
            onEdit={(rowId, columnId, value) => editCell(dataset, rowId, columnId, value)}
          />
          <p class="field__help">{en.view.editHint}</p>
        </>
      )}

      {query.trim() === '' ? null : <p class="field__help">{en.view.searchHint}</p>}
    </section>
  );
}
