import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { importText, undoButton } from './helpers';

const PEOPLE = [
  'name\tcity\tamount',
  'Bo\tStockholm\t12',
  'Anna\tGöteborg\t1 234,50',
  'Carl\tGöteborg\t7',
].join('\n');

function names(page: Page) {
  return page.locator('.table tbody tr td:nth-child(3)');
}

async function openMenu(page: Page, column: string): Promise<void> {
  await page.getByRole('button', { name: `Column menu for ${column}` }).click();
  await expect(page.getByRole('menu')).toBeVisible();
}

test('a header click sorts the view, again reverses it, and again clears it', async ({ app }) => {
  await importText(app, PEOPLE, 'People');
  const header = app.getByRole('button', { name: 'name', exact: true });
  await header.click();
  await expect(names(app)).toHaveText(['Anna', 'Bo', 'Carl']);
  await expect(app.locator('th[aria-sort="ascending"]')).toHaveCount(1);
  await expect(app.locator('.view__selection')).toContainText('Sorted by name, A–Z — the view only');
  await expect(undoButton(app)).toBeDisabled();

  await header.click();
  await expect(names(app)).toHaveText(['Carl', 'Bo', 'Anna']);
  await header.click();
  await expect(names(app)).toHaveText(['Bo', 'Anna', 'Carl']);
  await expect(app.locator('th[aria-sort]')).toHaveCount(0);
});

test('Make this order permanent turns the view order into a step', async ({ app }) => {
  await importText(app, PEOPLE, 'People');
  await app.getByRole('button', { name: 'name', exact: true }).click();
  await app.getByRole('button', { name: 'Make this order permanent' }).click();
  await expect(names(app)).toHaveText(['Anna', 'Bo', 'Carl']);
  await expect(undoButton(app)).toBeEnabled();
  await expect(app.locator('th[aria-sort]')).toHaveCount(0);
  await undoButton(app).click();
  await expect(names(app)).toHaveText(['Bo', 'Anna', 'Carl']);
});

test('the column menu renames, moves and removes through undoable steps', async ({ app }) => {
  await importText(app, PEOPLE, 'People');
  await openMenu(app, 'city');
  await app.getByRole('menuitem', { name: 'Rename…' }).click();
  await app.getByPlaceholder('New name').fill('Town');
  await app.keyboard.press('Enter');
  await expect(app.locator('.table thead')).toContainText('Town');

  await openMenu(app, 'Town');
  await app.getByRole('menuitem', { name: 'Move left' }).click();
  await expect(app.locator('.table thead th').nth(2)).toContainText('Town');

  await openMenu(app, 'Town');
  await app.getByRole('menuitem', { name: 'Remove column' }).click();
  await expect(app.locator('.table thead')).not.toContainText('Town');

  await undoButton(app).click();
  await undoButton(app).click();
  await undoButton(app).click();
  await expect(app.locator('.table thead th').nth(3)).toContainText('city');
  await expect(undoButton(app)).toBeDisabled();
});

test('Filter this column narrows the view and Clear filter restores it', async ({ app }) => {
  await importText(app, PEOPLE, 'People');
  await openMenu(app, 'city');
  await app.getByRole('menuitem', { name: 'Filter this column…' }).click();
  await app.getByPlaceholder('Show only rows where city contains').fill('göte');
  await app.keyboard.press('Enter');
  await expect(app.locator('.table tbody tr')).toHaveCount(2);
  await expect(app.locator('.view__selection')).toContainText('Showing only rows where city contains göte');
  await expect(app.locator('.statusbar__stats')).toContainText('3 rows');
  await app.getByRole('button', { name: 'Show all rows' }).click();
  await expect(app.locator('.table tbody tr')).toHaveCount(3);
});

test('Values… opens the Columns tab on that column', async ({ app }) => {
  await importText(app, PEOPLE, 'People');
  await openMenu(app, 'city');
  await app.getByRole('menuitem', { name: 'Values' }).click();
  await expect(app.locator('.side .segmented__button[aria-pressed="true"]')).toHaveText('Columns');
  await expect(app.locator('.profile__column:focus')).toContainText('city');
});

test('Tools for this column… narrows the picker to the tools that take a column', async ({
  app,
}) => {
  await importText(app, PEOPLE, 'People');
  await openMenu(app, 'amount');
  await app.getByRole('menuitem', { name: 'Tools for this column' }).click();
  await expect(app.locator('.side')).toContainText('Tools for amount');
  await expect(app.locator('.picker__tool', { hasText: 'Transpose' })).toHaveCount(0);
  await app.locator('.picker__tool', { hasText: 'Trim whitespace' }).click();
  await expect(app.locator('#tool-trim-whitespace-column')).toHaveValue('c3');
});

test('the ticked-rows strip removes rows in one click, undoably', async ({ app }) => {
  await importText(app, PEOPLE, 'People');
  await app.locator('.table tbody tr').nth(0).locator('input[type=checkbox]').check();
  await app.locator('.table tbody tr').nth(2).locator('input[type=checkbox]').check();
  await expect(app.locator('.view__selection')).toContainText('2 rows ticked');
  await app.getByRole('button', { name: 'Remove these' }).click();
  await expect(names(app)).toHaveText(['Anna']);
  await undoButton(app).click();
  await expect(app.locator('.table tbody tr')).toHaveCount(3);
});

test('numbers sit on the right, text on the left', async ({ app }) => {
  await importText(app, PEOPLE, 'People');
  const amount = app.locator('.table tbody tr').first().locator('td').nth(4);
  await expect(amount).toHaveClass(/is-numeric/);
  await expect(app.locator('.table tbody tr').first().locator('td').nth(2)).not.toHaveClass(/is-numeric/);
});

test('the arrow keys move between cells, Enter edits, Esc puts the value back', async ({ app }) => {
  await importText(app, PEOPLE, 'People');
  await app.locator('.table tbody tr').first().locator('.cell').first().focus();
  await app.keyboard.press('ArrowDown');
  await expect(app.locator(':focus')).toHaveText('Anna');
  await app.keyboard.press('ArrowRight');
  await expect(app.locator(':focus')).toHaveText('Göteborg');
  await app.keyboard.press('Enter');
  await expect(app.locator('.cell__input')).toBeFocused();
  await app.keyboard.type('X');
  await app.keyboard.press('Escape');
  await expect(app.locator('.table tbody tr').nth(1)).toContainText('Göteborg');
  await expect(undoButton(app)).toBeDisabled();
  await expect(app.locator(':focus')).toHaveText('Göteborg');
  await app.keyboard.press('Enter');
  await expect(app.locator('.cell__input')).toBeFocused();
  await app.keyboard.press('Control+a');
  await app.keyboard.type('Borås');
  await app.keyboard.press('Enter');
  await expect(app.locator('.table tbody tr').nth(1)).toContainText('Borås');
  await expect(undoButton(app)).toBeEnabled();
});

test('a long list is capped at 500 rows until asked for more', async ({ app }) => {
  const lines = Array.from({ length: 1200 }, (_, index) => `item ${index + 1}`).join('\n');
  await importText(app, lines, 'Long');
  await expect(app.locator('.table tbody tr')).toHaveCount(500);
  await expect(app.locator('.table__more')).toContainText('Showing the first 500 of 1200 rows');
  await app.getByRole('button', { name: 'Show 500 more' }).click();
  await expect(app.locator('.table tbody tr')).toHaveCount(1000);
  await app.getByRole('button', { name: 'Show all 1200' }).click();
  await expect(app.locator('.table tbody tr')).toHaveCount(1200);
});

test('the preview leads with the rows a tool changes', async ({ app }) => {
  // Only the tenth row has anything to lower-case, and it is the first row shown.
  await importText(app, 'a\nb\nc\nd\ne\nf\ng\nh\ni\nJ\nk', 'Words');
  await app.getByRole('button', { name: 'Tools', exact: true }).first().click();
  await app.locator('.picker__tool', { hasText: 'Change case' }).click();
  await expect(app.locator('.preview__caption')).toContainText('First 8 rows · the 1 changed ones first');
  await expect(app.locator('.preview .table tbody tr').first()).toContainText('j');
  await expect(app.locator('.preview .table tbody tr').first().locator('.mark')).toHaveCount(1);
});

test('typing in a tool option keeps up without re-running on every key', async ({ app }) => {
  const lines = Array.from({ length: 3000 }, (_, index) => `row ${index + 1}`).join('\n');
  await importText(app, lines, 'Long');
  await app.getByRole('button', { name: 'Tools', exact: true }).first().click();
  await app.getByPlaceholder('Search tools…').fill('replace');
  await app.locator('.picker__tool', { hasText: 'Find & replace' }).click();
  const started = Date.now();
  await app.locator('#tool-find-replace-find').pressSequentially('row 1', { delay: 20 });
  await expect(app.locator('.result .notice').first()).toContainText('Replaced');
  expect(Date.now() - started).toBeLessThan(4000);
});
