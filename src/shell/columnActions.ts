import type { Column, Dataset } from '../core/model';
import type { Tool } from '../core/registry';
import type { Settings } from '../core/settings';
import { selectColumn, setViewFilter, setViewSort } from '../core/store';
import type { ViewState } from '../core/view';
import { en } from '../i18n/en';
import { format } from '../i18n/format';
import { toolById } from '../tools';
import type { MenuItem } from './ColumnMenu';
import { applyTool } from './edits';
import type { PanelIntent } from './panelIntent';
import { startingOptions } from './toolOptions';

export interface ColumnContext {
  dataset: Dataset;
  view: ViewState;
  settings: Settings;
  /** The column the status bar counts on. */
  selected: string | null;
  onIntent: (intent: PanelIntent) => void;
}

/**
 * The one place the shell names tools by id, beside `edits.ts`. A menu entry that acts
 * on the list goes through the ordinary tool, so it lands in history and undoes; an
 * entry whose tool is missing or does not fit this list is simply not offered.
 */
function fitting(id: string, dataset: Dataset): Tool | undefined {
  const tool = toolById(id);
  return tool !== undefined && (tool.appliesTo?.(dataset) ?? true) ? tool : undefined;
}

/** Turn the view's order into a Sort step, with the same rules the view sorted by. */
export function makeSortPermanent(dataset: Dataset, view: ViewState, settings: Settings): boolean {
  const sort = fitting('sort', dataset);
  if (sort === undefined || view.sort === null) return false;
  return applyTool(dataset, sort.id, {
    ...startingOptions(sort, settings),
    column: view.sort.columnId,
    direction: view.sort.direction,
  });
}

/** What the ▾ beside a column offers, in the order it offers it. */
export function columnActions(column: Column, context: ColumnContext): MenuItem[] {
  const { dataset, view, settings, selected, onIntent } = context;
  const strings = en.columnMenu;
  const items: MenuItem[] = [];
  const sortedHere = view.sort !== null && view.sort.columnId === column.id;
  const filter = view.filter !== null && view.filter.columnId === column.id ? view.filter : null;

  items.push({
    id: 'sort-asc',
    label: strings.sortAsc,
    run: () => setViewSort({ columnId: column.id, direction: 'asc' }),
  });
  items.push({
    id: 'sort-desc',
    label: strings.sortDesc,
    run: () => setViewSort({ columnId: column.id, direction: 'desc' }),
  });
  if (sortedHere) {
    items.push({ id: 'sort-clear', label: strings.clearSort, run: () => setViewSort(null) });
    if (fitting('sort', dataset) !== undefined) {
      items.push({
        id: 'sort-permanent',
        label: strings.permanent,
        run: () => void makeSortPermanent(dataset, view, settings),
      });
    }
  }

  items.push({
    id: 'filter',
    label: strings.filter,
    input: {
      label: format(strings.filterPrompt, { column: column.name }),
      initial: filter?.value ?? '',
      submit: (value) =>
        setViewFilter(
          value.trim() === '' ? null : { columnId: column.id, value, mode: 'contains' },
        ),
    },
  });
  if (filter !== null) {
    items.push({ id: 'filter-clear', label: strings.clearFilter, run: () => setViewFilter(null) });
  }
  const filterRows = fitting('filter-rows', dataset);
  if (filterRows !== undefined) {
    // Look first, commit second: the tool opens on what the view already shows.
    items.push({
      id: 'keep-matching',
      label: strings.keepMatching,
      run: () =>
        onIntent({
          kind: 'tool',
          tool: filterRows,
          options: { column: column.id, mode: 'contains', pattern: filter?.value ?? '' },
        }),
    });
  }

  items.push({
    id: 'values',
    label: strings.values,
    run: () => onIntent({ kind: 'column-values', columnId: column.id }),
  });
  items.push({
    id: 'count',
    label: selected === column.id ? strings.countOff : strings.count,
    run: () => selectColumn(selected === column.id ? null : column.id),
  });

  const rename = fitting('rename-column', dataset);
  if (rename !== undefined) {
    items.push({
      id: 'rename',
      label: strings.rename,
      input: {
        label: strings.renamePrompt,
        initial: column.name,
        submit: (name) => {
          if (name.trim() !== '' && name.trim() !== column.name) {
            applyTool(dataset, rename.id, { column: column.id, name: name.trim() });
          }
        },
      },
    });
  }

  const move = fitting('move-column', dataset);
  const at = dataset.columns.findIndex((candidate) => candidate.id === column.id);
  if (move !== undefined && at > 0) {
    items.push({
      id: 'move-left',
      label: strings.moveLeft,
      run: () => void applyTool(dataset, move.id, { column: column.id, direction: 'left' }),
    });
  }
  if (move !== undefined && at < dataset.columns.length - 1) {
    items.push({
      id: 'move-right',
      label: strings.moveRight,
      run: () => void applyTool(dataset, move.id, { column: column.id, direction: 'right' }),
    });
  }

  const remove = fitting('remove-column', dataset);
  if (remove !== undefined) {
    items.push({
      id: 'remove',
      label: strings.remove,
      run: () => void applyTool(dataset, remove.id, { column: column.id }),
    });
  }

  items.push({
    id: 'tools',
    label: strings.tools,
    run: () => onIntent({ kind: 'column-tools', columnId: column.id }),
  });

  return items;
}
