import { useEffect, useState } from 'preact/hooks';
import { bestParser } from '../core/detect';
import { PARSE_STEP_ID } from '../core/history';
import type { Dataset } from '../core/model';
import { defaultOptions, type Options } from '../core/registry';
import { addDataset, applyStep, nextDatasetNumberForName } from '../core/store';
import { defaultParser, parserById, parsers } from '../parsers';
import { en } from '../i18n/en';
import { format, plural } from '../i18n/format';
import { Dialog } from './Dialog';
import { ImportPreview } from './ImportPreview';
import { ImportSource } from './ImportSource';
import { OptionsPanel } from './OptionsPanel';

interface Props {
  initialText: string;
  /** Set when re-parsing an open list instead of importing a new one. */
  target: Dataset | null;
  onClose: () => void;
}

export function ImportDialog({ initialText, target, onClose }: Props) {
  const reparsing = target !== null;
  const [text, setText] = useState(initialText);
  const [manual, setManual] = useState(reparsing);
  const [parserId, setParserId] = useState(target?.parse?.parserId ?? defaultParser.id);
  const [options, setOptions] = useState<Options>(target?.parse?.options ?? {});
  const [name, setName] = useState(
    target?.name ?? format(en.tabs.untitled, { n: nextDatasetNumberForName() }),
  );

  // Detection is advisory: it follows the text until the user picks a parser themselves.
  useEffect(() => {
    if (manual) return;
    const detected = bestParser(parsers, text);
    if (detected === null) return;
    setParserId(detected.parser.id);
    setOptions({ ...defaultOptions(detected.parser.options), ...detected.options });
  }, [text, manual]);

  const parser = parserById(parserId) ?? defaultParser;
  const preview = parser.parse(text, { ...defaultOptions(parser.options), ...options });
  const hasText = text.trim() !== '';

  function chooseParser(id: string): void {
    const chosen = parserById(id);
    if (chosen === undefined) return;
    setManual(true);
    setParserId(id);
    setOptions(defaultOptions(chosen.options));
  }

  function submit(): void {
    const rows = plural(preview.rows.length, en.status.rows);
    if (target === null) {
      addDataset(preview, name);
    } else {
      applyStep(
        target.id,
        {
          toolId: PARSE_STEP_ID,
          options: { parserId: parser.id, ...options },
          summary: format(en.steps.parse, { parser: parser.name, rows }),
          at: Date.now(),
        },
        preview,
      );
    }
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

      {reparsing ? null : (
        <div class="field">
          <label class="field__label" for="import-name">
            {en.import.nameLabel}
          </label>
          <input
            id="import-name"
            type="text"
            value={name}
            onInput={(event) => setName(event.currentTarget.value)}
          />
        </div>
      )}

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
          {reparsing ? en.import.resubmit : en.import.submit}
        </button>
      </div>
    </Dialog>
  );
}
