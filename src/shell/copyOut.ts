import type { Dataset } from '../core/model';
import type { Exporter, Options } from '../core/registry';
import { copyText } from './clipboard';

/**
 * Copy what an exporter renders. When that exporter also has an HTML form, both go on
 * the clipboard, so one Copy serves a text editor and Excel alike.
 */
export function copyExported(
  exporter: Exporter,
  dataset: Dataset,
  options: Options,
): Promise<boolean> {
  const text = exporter.render(dataset, options);
  const html = exporter.html?.(dataset, options);
  return html === undefined || html === '' ? copyText(text) : copyText(text, html);
}
