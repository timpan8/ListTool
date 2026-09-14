import { useEffect, useState } from 'preact/hooks';
import { bestParser } from '../core/detect';
import type { Dataset } from '../core/model';
import { carryOptions, defaultOptions, type Options } from '../core/registry';
import { withSettings } from '../core/settings';
import { activeDataset, nextDatasetNumberForName, settings } from '../core/store';
import { defaultParser, parserById, parsers } from '../parsers';
import { en } from '../i18n/en';
import { format } from '../i18n/format';
import { Dialog } from './Dialog';
import { ImportPreview } from './ImportPreview';
import { importInto } from './importInto';
import { ImportSource } from './ImportSource';
import { ImportTarget } from './ImportTarget';
import { OptionsPanel } from './OptionsPanel';

interface Props {
  initialText: string;
  /** Set when re-parsing an open list instead of importing a new one. */
  target: Dataset | null;
  /** Set when the command palette already chose the parser ("Re-parse as CSV"). */
  forceParserId: string | null;
  onClose: () => void;
}

export function ImportDialog({ initialText, target, forceParserId, onClose }: Props) {
  const reparsing = target !== null;
  const [text, setText] = useState(initialText);
  const [manual, setManual] = useState(reparsing || forceParserId !== null);
  const [parserId, setParserId] = useState(
    forceParserId ?? target?.parse?.parserId ?? defaultParser.id,
  );
  const [options, setOptions] = useState<Options>(
    forceParserId === null ? (target?.parse?.options ?? {}) : {},
  );
  const [name, setName] = useState(
    target?.name ?? format(en.tabs.untitled, { n: nextDatasetNumberForName() }),
  );
  // Where the parsed rows go: a new list, or the end of the one already open.
  const [append, setAppend] = useState(false);
  const openList = reparsing ? null : activeDataset.value;

  // Detection is advisory: it follows the text until the user picks a parser themselves.
  useEffect(() => {
    if (manual) return;
    const detected = bestParser(parsers, text);
    if (detected === null) return;
    setParserId(detected.parser.id);
    setOptions({ ...defaultOptions(detected.parser.options), ...detected.options });
  }, [text, manual]);

  const parser = parserById(parserId) ?? defaultParser;
  const base = withSettings(
    defaultOptions(parser.options),
    parser.options.map((field) => field.key),
    settings.value,
  );
  const preview = parser.parse(text, { ...base, ...options });
  const hasText = text.trim() !== '';

  function chooseParser(id: string): void {
    const chosen = parserById(id);
    if (chosen === undefined) return;
    setManual(true);
    setParserId(id);
    setOptions({
      ...withSettings(
        defaultOptions(chosen.options),
        chosen.options.map((field) => field.key),
        settings.value,
      ),
      ...carryOptions(chosen.options, parser.options, options),
    });
  }

  function submit(): void {
    importInto(preview, parser, options, {
      reparse: target,
      appendTo: append ? openList : null,
      name,
    });
    onClose();
  }

  return (
    <Dialog title={reparsing ? en.import.reparseTitle : en.import.title} onClose={onClose}>
      <ImportSource text={text} onText={setText} />

      <div class="field">
        <label class="field__label" for="import-parser">
          {en.import.parser}
        </label>
        <select
          id="import-parser"
          value={parser.id}
          onChange={(event) => chooseParser(event.currentTarget.value)}
        >
          {parsers.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </select>
        <p class="field__help">{parser.description}</p>
      </div>

      <ImportPreview parserName={parser.name} preview={preview} hasText={hasText} />

      <OptionsPanel
        idPrefix="import"
        fields={parser.options}
        options={options}
        columns={preview.columns}
        onChange={(key, value) => setOptions({ ...options, [key]: value })}
      />

      <ImportTarget
        openList={openList}
        append={append}
        onAppend={setAppend}
        showName={!reparsing && !append}
        name={name}
        onName={setName}
      />

      <div class="dialog__actions">
        <button type="button" class="button" onClick={onClose}>
          {en.import.cancel}
        </button>
        <button
          type="button"
          class="button button--primary"
          disabled={!hasText}
          onClick={submit}
        >
          {reparsing ? en.import.resubmit : append ? en.import.append : en.import.submit}
        </button>
      </div>
    </Dialog>
  );
}
