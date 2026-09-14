import { cell, type Dataset } from '../core/model';
import { stringOption, type Options } from '../core/registry';

/**
 * The column an exporter should read. A `column` option with no value means "the first
 * one", so a one-column list needs no configuration at all.
 */
export function selectedColumn(dataset: Dataset, options: Options): string | undefined {
  const requested = stringOption(options, 'column', '');
  if (requested !== '' && dataset.columns.some((column) => column.id === requested)) {
    return requested;
  }
  return dataset.columns[0]?.id;
}

/** Every value of the selected column, in row order. */
export function columnValues(dataset: Dataset, options: Options): string[] {
  const columnId = selectedColumn(dataset, options);
  if (columnId === undefined) return [];
  return dataset.rows.map((row) => cell(row, columnId));
}
