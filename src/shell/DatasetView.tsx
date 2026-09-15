import { useMemo, useState } from 'preact/hooks';
import type { Column, Dataset } from '../core/model';
import { numericColumns } from '../core/profile';
import { sortOptionsOf } from '../core/settings';
import {
  activeView,
  selectedColumn,
  selectedRows,
  selectRows,
  settings,
  setViewQuery,
  toggleRow,
  toggleViewSort,
  viewFilter,
  viewQuery,
  viewSort,
} from '../core/store';
import { visibleRows } from '../core/view';
import { en } from '../i18n/en';
import { format } from '../i18n/format';
import { columnActions } from './columnActions';
import { DataTable } from './DataTable';
import { editCell } from './edits';
import type { PanelIntent } from './panelIntent';
import { ViewStatus } from './ViewStatus';

interface Props {
  dataset: Dataset;
  onReparse: () => void;
  onIntent: (intent: PanelIntent) => void;
}

/**
 * Raw | Table. The search, the filter and the header sort all narrow or order the VIEW
 * and never the list; everything that changes the list goes through a tool, from the
 * column menu or the ticked-rows strip, and undoes.
 */
export function DatasetView({ dataset, onReparse, onIntent }: Props) {
  const [mode, setMode] = useState<'table' | 'raw'>('table');
  const query = viewQuery.value;
  const filter = viewFilter.value;
  const sort = viewSort.value;
  const prefs = settings.value;
  const rows = useMemo(
    () => visibleRows(dataset, query, filter, sort, sortOptionsOf(prefs)),
    [dataset, query, filter, sort, prefs],
  );
  const ticked = selectedRows.value;
  const selected = selectedColumn.value;

  const menuFor = (column: Column) =>
    columnActions(column, { dataset, view: activeView.value, settings: prefs, selected, onIntent });

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
              onInput={(event) => setViewQuery(event.currentTarget.value)}
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

      {mode === 'table' ? <ViewStatus dataset={dataset} onIntent={onIntent} /> : null}

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
            key={dataset.id}
            columns={dataset.columns}
            rows={rows}
            selected={selected}
            showRowNumbers
            ticked={ticked}
            onTick={toggleRow}
            // "Every row" means every row on screen: the search filters the view, and a
            // tick you cannot see is a tick you did not mean.
            onTickAll={(checked) => selectRows(checked ? rows.map((row) => row.id) : [])}
            onEdit={(rowId, columnId, value) => editCell(dataset, rowId, columnId, value)}
            sort={sort}
            onSort={toggleViewSort}
            columnMenu={menuFor}
            numeric={numericColumns(dataset)}
          />
          <p class="field__help">{en.view.editHint}</p>
        </>
      )}

      {query.trim() === '' ? null : <p class="field__help">{en.view.searchHint}</p>}
    </section>
  );
}
