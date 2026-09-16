import { stringOption, type Exporter } from '../core/registry';
import { columnValues } from './column';
import { ui } from '../i18n';

/**
 * A quote inside a value is doubled, which is how both SQL and PowerShell escape it.
 * Without that, one apostrophe in a name would break the statement it is pasted into.
 */
function quoteValue(value: string, quote: string): string {
  if (quote === '') return value;
  return quote + value.split(quote).join(quote + quote) + quote;
}

export const quotedJoinExporter: Exporter = {
  id: 'quoted-join',
  name: ui.exporters.quoted.name,
  options: [
    { key: 'column', label: ui.exporters.quoted.column, type: 'column' },
    {
      key: 'quote',
      label: ui.exporters.quoted.quote,
      type: 'text',
      default: "'",
      help: ui.exporters.quoted.help,
    },
    { key: 'separator', label: ui.exporters.quoted.separator, type: 'text', default: ',' },
  ],
  render(dataset, options) {
    const quote = stringOption(options, 'quote', "'");
    const separator = stringOption(options, 'separator', ',');
    return columnValues(dataset, options)
      .map((value) => quoteValue(value, quote))
      .join(separator);
  },
};
