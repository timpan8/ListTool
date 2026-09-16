import { ui } from '../i18n';

const SHORTCUTS = [
  'palette',
  'apply',
  'undo',
  'redo',
  'copy',
  'close',
  'paste',
  'cells',
  'edit',
] as const;

/** The shortcuts, shown in the UI rather than only documented. */
export function ShortcutsTable() {
  return (
    <section class="field">
      <h3 class="field__label">{ui.settings.shortcuts}</h3>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{ui.settings.shortcutKeys}</th>
              <th>{ui.settings.shortcutAction}</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((key) => (
              <tr key={key}>
                <td>
                  <kbd>{ui.shortcuts.keys[key]}</kbd>
                </td>
                <td>{ui.shortcuts[key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
