import type { Dataset } from '../core/model';
import { defaultOptions, type Exporter, type Options } from '../core/registry';
import { sortOptionsOf, type Settings } from '../core/settings';
import { copyScope, scopeRows, withVisible, type RowScope, type ViewState } from '../core/view';
import { copyExporter, exporterById, isTableExporter } from '../exporters';
import { ui } from '../i18n';
import { format, plural } from '../i18n/format';
import { copyText } from './clipboard';
import { withColumnDefaults } from './toolOptions';

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

export interface ViewRender {
  exporter: Exporter;
  /** The dataset narrowed to the scope: what was actually rendered. */
  dataset: Dataset;
  scope: RowScope;
  text: string;
  html?: string;
}

/**
 * Render what is on screen — the ticked rows if any, else the rows the search and the
 * filter show, in the view's order — with the exporter asked for, or the one the list's
 * shape calls for. Pure: this is the whole of "copy what I see" except the clipboard.
 */
export function renderView(
  source: Dataset,
  view: ViewState,
  settings: Settings,
  exporterId?: string,
): ViewRender {
  const exporter =
    (exporterId === undefined ? undefined : exporterById(exporterId)) ?? copyExporter(source);
  const scope = copyScope(view);
  const dataset = withVisible(source, scopeRows(source, scope, view, sortOptionsOf(settings)));
  const options = withColumnDefaults(
    exporter.options,
    defaultOptions(exporter.options),
    dataset.columns,
  );
  const html = exporter.html?.(dataset, options);
  return {
    exporter,
    dataset,
    scope,
    text: exporter.render(dataset, options),
    ...(html === undefined || html === '' ? {} : { html }),
  };
}

/** The status line after a copy: what was taken, how much of it, and in what shape. */
export function copyNotice(
  copied: boolean,
  dataset: Dataset,
  scope: RowScope,
  exporter: Exporter,
): string {
  if (!copied) return ui.toolbar.copyFailed;
  const n = dataset.rows.length;
  const which = plural(
    n,
    scope === 'ticked'
      ? ui.toolbar.copiedTicked
      : scope === 'shown'
        ? ui.toolbar.copiedShown
        : ui.toolbar.copiedAll,
  );
  const what = isTableExporter(exporter)
    ? plural(dataset.columns.length, ui.toolbar.asTable)
    : exporter.name;
  return format(ui.toolbar.copied, { which, what });
}

/** Copy what is on screen, and say what was copied. Every copy path in the shell ends here. */
export async function copyView(
  source: Dataset,
  view: ViewState,
  settings: Settings,
  exporterId?: string,
): Promise<string> {
  const rendered = renderView(source, view, settings, exporterId);
  if (rendered.dataset.rows.length === 0) return ui.toolbar.nothingToCopy;
  const copied = await copyText(rendered.text, rendered.html);
  return copyNotice(copied, rendered.dataset, rendered.scope, rendered.exporter);
}
