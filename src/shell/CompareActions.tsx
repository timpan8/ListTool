import {
  selectRows,
  type CompareResult as Outcome,
  type SelectionKind,
  type SideBySide,
} from '../core/compare';
import type { Dataset, Row } from '../core/model';
import { defaultOptions } from '../core/registry';
import { addDataset, setNotice } from '../core/store';
import { withVisible } from '../core/view';
import { copyExporter } from '../exporters';
import { ui } from '../i18n';
import { format } from '../i18n/format';
import { rowIdsAfter } from '../tools/helpers';
import { copyExported, copyNotice } from './copyOut';

const CREATIONS: SelectionKind[] = ['both', 'only-a', 'only-b', 'union', 'differences'];

interface Props {
  a: Dataset;
  b: Dataset;
  result: Outcome;
  side: SideBySide;
  /** The rows on screen under the current filter and order. */
  shown: Row[];
  onCreated: () => void;
}

/** Turn any part of the outcome into a new list, or copy the table as it is shown. */
export function CompareActions({ a, b, result, side, shown, onCreated }: Props) {
  const names = { a: a.name, b: b.name };

  function create(kind: SelectionKind): void {
    const picked = selectRows(result.rows, kind);
    // The new list keeps the shape of whichever side actually contributed rows. Rows
    // keep their ids; rows from the other side get ids past them, so none repeats.
    const source = picked.a.length > 0 || picked.b.length === 0 ? a : b;
    const nextId = rowIdsAfter({ rows: picked.a });
    const rows = [...picked.a, ...picked.b.map((row) => ({ id: nextId(), cells: row.cells }))];
    addDataset(
      { ...source, rows },
      format(ui.compare.newListName, { what: format(ui.compare.creations[kind], names), ...names }),
    );
    onCreated();
  }

  async function copy(): Promise<void> {
    const dataset = withVisible(side.dataset, shown);
    const exporter = copyExporter(dataset);
    const copied = await copyExported(exporter, dataset, defaultOptions(exporter.options));
    setNotice(copyNotice(copied, dataset, 'shown', exporter));
  }

  return (
    <div class="compare__create">
      <span class="field__label">{ui.compare.create}</span>
      {CREATIONS.map((kind) => (
        <button key={kind} type="button" class="button" onClick={() => create(kind)}>
          {format(ui.compare.creations[kind], names)}
        </button>
      ))}
      <span class="toolbar__gap" />
      <button type="button" class="button" onClick={() => void copy()}>
        {ui.compare.copyShown}
      </button>
    </div>
  );
}
