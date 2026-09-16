import { DELIMITER_PRESETS } from '../core/detect';
import { LANGUAGES, readLanguage } from '../core/settings';
import {
  clearAllData,
  flushPersistence,
  openWorkspaceFile,
  settings,
  updateSettings,
  workspaceFile,
} from '../core/store';
import { ui } from '../i18n';
import { Dialog } from './Dialog';
import { downloadText } from './download';
import { ShortcutsTable } from './ShortcutsTable';

interface Props {
  onClose: () => void;
  onCleared: () => void;
  /** Reports what happened with a workspace file, in the status bar. */
  onNotice: (message: string) => void;
}

export function Settings({ onClose, onCleared, onNotice }: Props) {
  const current = settings.value;

  return (
    <Dialog title={ui.settings.title} onClose={onClose}>
      <div class="field">
        <label class="field__label" for="settings-language">
          {ui.settings.language}
        </label>
        <select
          id="settings-language"
          value={current.language}
          onChange={(event) => {
            // The strings are chosen once per page load, so the choice is written out
            // at once and the page starts over in the new language.
            updateSettings({ language: readLanguage(event.currentTarget.value) });
            flushPersistence();
            location.reload();
          }}
        >
          {LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {ui.settings.languages[code]}
            </option>
          ))}
        </select>
        <p class="field__help">{ui.settings.languageHelp}</p>
      </div>

      <div class="field">
        <label class="field__label" for="settings-delimiter">
          {ui.settings.defaultDelimiter}
        </label>
        <select
          id="settings-delimiter"
          value={current.defaultDelimiter}
          onChange={(event) => updateSettings({ defaultDelimiter: event.currentTarget.value })}
        >
          {DELIMITER_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.value}>
              {ui.options.delimiters[preset.id as keyof typeof ui.options.delimiters]}
            </option>
          ))}
        </select>
      </div>

      <div class="field">
        <label class="field__label" for="settings-locale">
          {ui.settings.sortLocale}
        </label>
        <select
          id="settings-locale"
          value={current.sortLocale}
          onChange={(event) => updateSettings({ sortLocale: event.currentTarget.value })}
        >
          <option value="sv">{ui.tools.sort.localeSv}</option>
          <option value="en">{ui.tools.sort.localeEn}</option>
        </select>
      </div>

      <div class="field">
        <label class="field__label" for="settings-order">
          {ui.settings.nameOrder}
        </label>
        <select
          id="settings-order"
          value={current.defaultNameOrder}
          onChange={(event) =>
            updateSettings({
              defaultNameOrder:
                event.currentTarget.value === 'first-last' ? 'first-last' : 'last-first',
            })
          }
        >
          <option value="last-first">{ui.parsers.recipients.lastFirst}</option>
          <option value="first-last">{ui.parsers.recipients.firstLast}</option>
        </select>
      </div>

      <div class="field field--check">
        <label class="choice">
          <input
            type="checkbox"
            checked={current.naturalSort}
            onChange={(event) => updateSettings({ naturalSort: event.currentTarget.checked })}
          />
          {ui.settings.naturalSort}
        </label>
      </div>

      <div class="field field--check">
        <label class="choice">
          <input
            type="checkbox"
            checked={current.keepLists}
            onChange={(event) => updateSettings({ keepLists: event.currentTarget.checked })}
          />
          {ui.settings.keepLists}
        </label>
        <p class="field__help">{ui.settings.keepListsHelp}</p>
      </div>

      <section class="field">
        <h3 class="field__label">{ui.settings.workspace}</h3>
        <div class="field__row">
          <button
            type="button"
            class="button"
            onClick={() => {
              downloadText(`${ui.settings.workspaceFilename}.json`, workspaceFile());
              onNotice(ui.settings.saved);
            }}
          >
            {ui.settings.saveFile}
          </button>
          <label class="button">
            {ui.settings.openFile}
            <input
              type="file"
              accept="application/json,.json"
              class="visually-hidden"
              onChange={async (event) => {
                const file = event.currentTarget.files?.[0];
                if (file === undefined) return;
                const opened = openWorkspaceFile(await file.text());
                onNotice(opened ? ui.settings.opened : ui.settings.openFailed);
                if (opened) onClose();
              }}
            />
          </label>
        </div>
        <p class="field__help">{ui.settings.saveFileHelp}</p>
        <p class="field__help">{ui.settings.openFileHelp}</p>
      </section>

      <section class="field">
        <h3 class="field__label">{ui.settings.storage}</h3>
        <button
          type="button"
          class="button"
          onClick={() => {
            clearAllData();
            onCleared();
            onClose();
          }}
        >
          {ui.settings.clear}
        </button>
        <p class="field__help">{ui.settings.clearHelp}</p>
      </section>

      <ShortcutsTable />

      <div class="dialog__actions">
        <button type="button" class="button button--primary" onClick={onClose}>
          {ui.settings.close}
        </button>
      </div>
    </Dialog>
  );
}
