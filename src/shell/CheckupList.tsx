import type { Dataset } from '../core/model';
import { checkup } from '../core/checkup';
import { memoByDataset } from '../core/memo';
import type { Options, Tool } from '../core/registry';
import { tools } from '../tools';
import { ui } from '../i18n';
import { format } from '../i18n/format';

interface Props {
  dataset: Dataset;
  onPick: (tool: Tool, options?: Options) => void;
}

/** Every tool's check runs once per list, not once per time the panel is looked at. */
const checkupOf = memoByDataset((dataset) => checkup(dataset, tools));

/**
 * What the tools would find, above the list of tools. No new tab and no new concept:
 * each finding is a way into the ordinary tool with its options already set, and the
 * ordinary preview still has the last word before anything changes.
 */
export function CheckupList({ dataset, onPick }: Props) {
  const found = checkupOf(dataset);
  if (found.length === 0) return null;

  return (
    <section class="picker__group">
      <h3 class="picker__title">{ui.checkup.title}</h3>
      <p class="field__help">{ui.checkup.intro}</p>
      <ul class="picker__list">
        {found.map(({ tool, finding }) => (
          <li key={tool.id} class="picker__row">
            <button
              type="button"
              class="picker__tool finding"
              title={format(ui.checkup.open, { tool: tool.name })}
              onClick={() => onPick(tool, finding.options)}
            >
              <span class="picker__name">{finding.summary}</span>
              <span class="picker__description">{tool.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
