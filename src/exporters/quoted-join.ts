import { stringOption, type Exporter } from '../core/registry';
import { columnValues } from './column';
import { en } from '../i18n/en';

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
  name: en.exporters.quoted.name,
  options: [
    { key: 'column', label: en.exporters.quoted.column, type: 'column' },
    {
      key: 'quote',
      label: en.exporters.quoted.quote,
      type: 'text',
      default: "'",
      help: en.exporters.quoted.help,
    },
    { key: 'separator', label: en.exporters.quoted.separator, type: 'text', default: ',' },
  ],
  render(dataset, options) {
    const quote = stringOption(options, 'quote', "'");
    const separator = stringOption(options, 'separator', ',');
    return columnValues(dataset, options)
      .map((value) => quoteValue(value, quote))
      .join(separator);
  },
};
