import { expect, type Page } from '@playwright/test';

/**
 * Above this many characters the text goes in through the file button instead of the
 * textarea: Chromium inserts a long text into a textarea a few thousand lines per ten
 * seconds, which is the harness being slow, not the app.
 */
const PASTE_LIMIT = 20000;

/** Paste text into the import dialog, name the list, and confirm. */
export async function importText(page: Page, text: string, name?: string): Promise<void> {
  await page.getByRole('button', { name: 'Import', exact: true }).first().click();
  if (text.length > PASTE_LIMIT) {
    await page
      .locator('.dialog input[type=file]')
      .setInputFiles({ name: 'list.txt', mimeType: 'text/plain', buffer: Buffer.from(text) });
    await expect(page.getByLabel('Paste or type your list')).toHaveValue(text);
  } else {
    await page.getByLabel('Paste or type your list').fill(text);
  }
  // With a list already open the dialog also offers importing into it.
  const target = page.locator('#import-target');
  if ((await target.count()) > 0) await target.selectOption('new');
  if (name !== undefined) await page.locator('#import-name').fill(name);
  await page.locator('.dialog__actions .button--primary').click();
  await expect(page.locator('.dialog')).toHaveCount(0);
}

/** Open the tools panel at its top level, whatever state it was left in. */
export async function openTools(page: Page): Promise<void> {
  if ((await page.getByRole('button', { name: 'Close panel' }).count()) === 0) {
    await page.getByRole('button', { name: 'Tools', exact: true }).first().click();
  }
  const back = page.getByRole('button', { name: 'Back to all tools' });
  if ((await back.count()) > 0) await back.click();
}

/** Find a tool by name in the picker and open it, so its preview is on screen. */
export async function pickTool(page: Page, name: string): Promise<void> {
  await openTools(page);
  await page.getByPlaceholder('Search tools…').fill(name);
  await page.getByRole('button', { name: new RegExp(`^${name}`, 'i') }).first().click();
  await expect(page.locator('.result__title')).toHaveText(new RegExp(`^${name}`, 'i'));
}

/** Apply the tool whose preview is on screen. */
export async function applyTool(page: Page): Promise<void> {
  await page.locator('.result__actions .button--primary').click();
}

export function undoButton(page: Page) {
  return page.locator('.toolbar').getByRole('button', { name: 'Undo', exact: true });
}
