import { DELIMITER_PRESETS } from '../core/detect';
import {
  clearAllData,
  openWorkspaceFile,
  settings,
  updateSettings,
  workspaceFile,
} from '../core/store';
import { en } from '../i18n/en';
import { Dialog } from './Dialog';
import { downloadText } from './download';

interface Props {
  onClose: () => void;
  onCleared: () => void;
  /** Reports what happened with a workspace file, in the status bar. */
  onNotice: (message: string) => void;
}

const SHORTCUTS = ['palette', 'apply', 'undo', 'redo', 'copy', 'close', 'paste'] as const;

export function Settings({ onClose, onCleared, onNotice }: Props) {
  const current = settings.value;

  return (
    <Dialog title={en.settings.title} onClose={onClose}>
      <div class="field">
        <label class="field__label" for="settings-delimiter">
          {en.settings.defaultDelimiter}
        </label>
        <select
          id="settings-delimiter"
          value={current.defaultDelimiter}
          onChange={(event) => updateSettings({ defaultDelimiter: event.currentTarget.value })}
        >
          {DELIMITER_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.value}>
              {en.options.delimiters[preset.id as keyof typeof en.options.delimiters]}
            </option>
          ))}
        </select>
      </div>

      <div class="field">
        <label class="field__label" for="settings-locale">
          {en.settings.sortLocale}
        </label>
        <select
          id="settings-locale"
          value={current.sortLocale}
          onChange={(event) => updateSettings({ sortLocale: event.currentTarget.value })}
        >
          <option value="sv">{en.tools.sort.localeSv}</option>
          <option value="en">{en.tools.sort.localeEn}</option>
        </select>
      </div>

      <div class="field">
        <label class="field__label" for="settings-order">
          {en.settings.nameOrder}
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
          <option value="last-first">{en.parsers.recipients.lastFirst}</option>
          <option value="first-last">{en.parsers.recipients.firstLast}</option>
        </select>
      </div>

      <div class="field field--check">
        <label class="choice">
          <input
            type="checkbox"
            checked={current.naturalSort}
            onChange={(event) => updateSettings({ naturalSort: event.currentTarget.checked })}
          />
          {en.settings.naturalSort}
        </label>
      </div>

      <div class="field field--check">
        <label class="choice">
          <input
            type="checkbox"
            checked={current.keepLists}
            onChange={(event) => updateSettings({ keepLists: event.currentTarget.checked })}
          />
          {en.settings.keepLists}
        </label>
        <p class="field__help">{en.settings.keepListsHelp}</p>
      </div>

      <section class="field">
        <h3 class="field__label">{en.settings.workspace}</h3>
        <div class="field__row">
          <button
            type="button"
            class="button"
            onClick={() => {
              downloadText(`${en.settings.workspaceFilename}.json`, workspaceFile());
              onNotice(en.settings.saved);
            }}
          >
            {en.settings.saveFile}
          </button>
          <label class="button">
            {en.settings.openFile}
            <input
              type="file"
              accept="application/json,.json"
              class="visually-hidden"
              onChange={async (event) => {
                const file = event.currentTarget.files?.[0];
                if (file === undefined) return;
                const opened = openWorkspaceFile(await file.text());
                onNotice(opened ? en.settings.opened : en.settings.openFailed);
                if (opened) onClose();
              }}
            />
          </label>
        </div>
        <p class="field__help">{en.settings.saveFileHelp}</p>
        <p class="field__help">{en.settings.openFileHelp}</p>
      </section>

      <section class="field">
        <h3 class="field__label">{en.settings.storage}</h3>
        <button
          type="button"
          class="button"
          onClick={() => {
            clearAllData();
            onCleared();
            onClose();
          }}
        >
          {en.settings.clear}
        </button>
        <p class="field__help">{en.settings.clearHelp}</p>
      </section>

      <section class="field">
        <h3 class="field__label">{en.settings.shortcuts}</h3>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>{en.settings.shortcutKeys}</th>
                <th>{en.settings.shortcutAction}</th>
              </tr>
            </thead>
            <tbody>
              {SHORTCUTS.map((key) => (
                <tr key={key}>
                  <td>
                    <kbd>{en.shortcuts.keys[key]}</kbd>
                  </td>
                  <td>{en.shortcuts[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div class="dialog__actions">
        <button type="button" class="button button--primary" onClick={onClose}>
          {en.settings.close}
        </button>
      </div>
    </Dialog>
  );
}
