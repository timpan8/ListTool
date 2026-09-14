import { DELIMITER_PRESETS } from '../core/detect';
import { clearAllData, settings, updateSettings } from '../core/store';
import { en } from '../i18n/en';
import { Dialog } from './Dialog';

interface Props {
  onClose: () => void;
  onCleared: () => void;
}

const SHORTCUTS = ['palette', 'apply', 'undo', 'redo', 'copy', 'close', 'paste'] as const;

export function Settings({ onClose, onCleared }: Props) {
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
