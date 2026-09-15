import { expect, test } from './fixtures';
import { applyTool, importText, pickTool, undoButton } from './helpers';

const EMAILS = 'anna@example.com\nbo@example.com\ncarl@example.com';
const CSV = 'name,email\n"Andersson, Anna",anna@example.com\nBo Berg,bo@example.com';

test('the empty state teaches, and a pasted list becomes rows', async ({ app }) => {
  await expect(app.getByText('Paste a list to start')).toBeVisible();
  await importText(app, EMAILS, 'People');
  await expect(app.locator('.table tbody tr')).toHaveCount(3);
  await expect(app.locator('.statusbar__stats')).toContainText('3 rows');
});

test('a CSV header names the columns, and a quoted comma stays in its cell', async ({ app }) => {
  await importText(app, CSV, 'Customers');
  await expect(app.locator('.table thead')).toContainText('name');
  await expect(app.locator('.table thead')).toContainText('email');
  await expect(app.locator('.table tbody tr').first()).toContainText('Andersson, Anna');
});

test('a tool previews with a summary, applies as one step, and undoes', async ({ app }) => {
  await importText(app, 'anna@example.com\nbo@example.com\nanna@example.com', 'Doubled');
  await pickTool(app, 'Remove duplicates');
  await expect(app.locator('.result .notice').first()).toContainText(
    'Removed 1 duplicate (3 rows → 2 rows)',
  );
  await expect(undoButton(app)).toBeDisabled();
  await applyTool(app);
  await expect(app.locator('.table tbody tr')).toHaveCount(2);
  await expect(undoButton(app)).toBeEnabled();
  await undoButton(app).click();
  await expect(app.locator('.table tbody tr')).toHaveCount(3);
  await expect(undoButton(app)).toBeDisabled();
});

test('the export dialog previews the chosen format and closes on Escape', async ({ app }) => {
  await importText(app, CSV, 'Customers');
  await app.getByRole('button', { name: 'Export', exact: true }).click();
  await app.locator('#export-format').selectOption('csv');
  await expect(app.locator('.preview__text')).toContainText('name,email');
  await app.keyboard.press('Escape');
  await expect(app.locator('.dialog')).toHaveCount(0);
});

test('compare opens with a panel per list and reports the outcome', async ({ app }) => {
  await importText(app, EMAILS, 'Customers');
  await importText(app, 'bo@example.com\ndora@example.com', 'Leads');
  await app.locator('.toolbar').getByRole('button', { name: 'Compare', exact: true }).click();
  await expect(app.locator('.compare__panel')).toHaveCount(2);
  await expect(app.locator('.compare .notice').first()).toContainText('in both');
  await app.getByRole('button', { name: 'Close compare' }).click();
  await expect(app.locator('.compare')).toHaveCount(0);
});

test('the command palette opens on Ctrl+K and closes on Escape', async ({ app }) => {
  await importText(app, EMAILS, 'People');
  await app.keyboard.press('Control+k');
  await expect(app.getByPlaceholder('Search tools, parsers and formats…')).toBeVisible();
  await app.keyboard.press('Escape');
  await expect(app.locator('.dialog')).toHaveCount(0);
});
