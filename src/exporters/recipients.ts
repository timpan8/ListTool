import { cell, type Dataset } from '../core/model';
import { booleanOption, stringOption, type Exporter, type Options } from '../core/registry';
import { ui } from '../i18n';

const strings = ui.exporters.recipients;

/** The column a field means, falling back to the id the Recipients parser produces. */
function columnFor(dataset: Dataset, options: Options, key: string, fallback: string): string {
  const chosen = stringOption(options, key, '');
  if (chosen !== '' && dataset.columns.some((column) => column.id === chosen)) return chosen;
  return dataset.columns.some((column) => column.id === fallback) ? fallback : '';
}

/**
 * RFC 5322 §3.4: a display name holding a comma has to be quoted, or the comma reads as
 * the end of the recipient. This is the exact case the Recipients parser exists for, so
 * the way back has to survive it too.
 */
function displayName(name: string, quote: boolean): string {
  if (!quote || !/[,;<>"]/.test(name)) return name;
  return `"${name.replace(/"/g, '\\"')}"`;
}

export const recipientsExporter: Exporter = {
  id: 'recipients',
  name: strings.name,
  extension: 'txt',
  options: [
    { key: 'first', label: strings.first, type: 'column', allowNone: true, default: '' },
    { key: 'last', label: strings.last, type: 'column', allowNone: true, default: '' },
    { key: 'email', label: strings.email, type: 'column', allowNone: true, default: '' },
    {
      key: 'order',
      label: strings.order,
      type: 'select',
      default: 'last-first',
      choices: [
        { value: 'last-first', label: strings.lastFirst },
        { value: 'first-last', label: strings.firstLast },
      ],
    },
    { key: 'separator', label: strings.separator, type: 'delimiter', default: '; ' },
    { key: 'quote', label: strings.quote, type: 'boolean', default: true, help: strings.help },
  ],
  render(dataset, options) {
    const firstId = columnFor(dataset, options, 'first', 'first');
    const lastId = columnFor(dataset, options, 'last', 'last');
    // A plain list of addresses is a recipient list too, so with nothing else to go on
    // the first column is read as the address rather than producing nothing at all.
    const emailId =
      columnFor(dataset, options, 'email', 'email') ||
      (firstId === '' && lastId === '' ? (dataset.columns[0]?.id ?? '') : '');
    const lastFirst = stringOption(options, 'order', 'last-first') === 'last-first';
    const quote = booleanOption(options, 'quote', true);

    return dataset.rows
      .map((row) => {
        const first = firstId === '' ? '' : cell(row, firstId).trim();
        const last = lastId === '' ? '' : cell(row, lastId).trim();
        const email = emailId === '' ? '' : cell(row, emailId).trim();

        const parts = lastFirst ? [last, first] : [first, last];
        const name = displayName(parts.filter((part) => part !== '').join(' '), quote);

        // A bare address is a valid recipient; a name with no address is not one at all.
        if (email === '') return name;
        return name === '' ? email : `${name} <${email}>`;
      })
      .filter((entry) => entry !== '')
      .join(stringOption(options, 'separator', '; '));
  },
};
