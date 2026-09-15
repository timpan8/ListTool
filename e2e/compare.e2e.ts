import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { importText, openTools } from './helpers';

const KUNDER = 'name\tcity\temail\nAnna\tGöteborg\tanna@example.com\nBo\tStockholm\tbo@example.com';
const LEADS = 'name\tcity\temail\nAnna\tBorås\tanna@example.com\nDora\tMalmö\tdora@example.com';

async function openCompare(page: Page): Promise<void> {
  await importText(page, KUNDER, 'Kunder');
  await importText(page, LEADS, 'Leads');
  await page.locator('.toolbar').getByRole('button', { name: 'Compare', exact: true }).click();
  await expect(page.locator('.compare__panel')).toHaveCount(2);
}

test('both lists are called by their names, everywhere', async ({ app }) => {
  await openCompare(app);
  await expect(app.locator('.compare__panel-title')).toHaveText(['Kunder', 'Leads']);
  await expect(app.locator('.compare .notice').first()).toHaveText(
    '1 in both · 0 with different counts · 1 only in Kunder · 1 only in Leads · 1 matched row has a cell that differs',
  );
  await expect(app.getByRole('button', { name: 'Only in Kunder', exact: true })).toHaveCount(2);
  await expect(app.locator('.table__groups')).toContainText('Kunder');
  await expect(app.locator('.table__groups')).toContainText('Leads');
  await expect(app.locator('.compare .options')).toContainText('Match on · Kunder');
  await expect(app.locator('.compare .options')).toContainText('Match on · Leads');
  await expect(app.locator('.compare .table tbody')).toContainText('← Only in Kunder');
  await expect(app.locator('.compare .table tbody')).toContainText('→ Only in Leads');
});

test('a matched row shows both sides and marks the cell that differs', async ({ app }) => {
  await openCompare(app);
  const anna = app.locator('.compare .table tbody tr').first();
  await expect(anna).toContainText('✓ In both');
  await expect(anna).toContainText('Göteborg');
  await expect(anna).toContainText('Borås');
  await expect(anna.locator('td.is-changed')).toHaveCount(2);
  await expect(app.locator('.compare .table tbody tr').nth(1).locator('td.is-changed')).toHaveCount(0);
});

test('the chips filter, and swapping turns the lists around', async ({ app }) => {
  await openCompare(app);
  await app.locator('.compare__chips').getByRole('button', { name: 'Only in Kunder' }).click();
  await expect(app.locator('.compare .table tbody tr')).toHaveCount(1);
  await expect(app.locator('.compare .table tbody')).toContainText('Bo');

  await app.getByRole('button', { name: 'Swap the lists' }).click();
  await expect(app.locator('.compare__panel-title')).toHaveText(['Leads', 'Kunder']);
  await expect(app.locator('.compare__chips')).toContainText('Only in Leads');
  await app.locator('.compare__chips').getByRole('button', { name: 'Only in Leads' }).click();
  await expect(app.locator('.compare .table tbody')).toContainText('Dora');
});

test('a new list can be made from any bucket, named after the lists', async ({ app }) => {
  await openCompare(app);
  await app.locator('.compare__create').getByRole('button', { name: 'Only in Kunder' }).click();
  await expect(app.locator('.tabs')).toContainText('Only in Kunder (Kunder / Leads)');
  await expect(app.locator('.table tbody tr')).toHaveCount(1);
  await expect(app.locator('.table tbody')).toContainText('bo@example.com');
});

test('Copy what is shown puts the comparison on the clipboard as a table', async ({ app }) => {
  await openCompare(app);
  await app.getByRole('button', { name: 'Copy what is shown' }).click();
  await expect(app.locator('.statusbar__notice')).toContainText('Copied the 3 rows shown as a table');
  const text = await app.evaluate(() => navigator.clipboard.readText());
  expect(text.split('\n')[0]).toBe('Status\tname\tcity\temail\tname\tcity\temail');
  expect(text).toContain('✓ In both\tAnna\tGöteborg\tanna@example.com\tAnna\tBorås\tanna@example.com');
});

test('a dual tool names the lists in its form, and a recipe replays it', async ({ app }) => {
  await importText(app, KUNDER, 'Kunder');
  await importText(app, LEADS, 'Leads');
  await app.getByRole('button', { name: 'Kunder', exact: true }).click();
  await openTools(app);
  await app.getByPlaceholder('Search tools…').fill('another list');
  await app.locator('.picker__tool', { hasText: 'Remove rows found in another list' }).click();
  await expect(app.locator('.result .options')).toContainText('Match on · Kunder');
  await expect(app.locator('.result .options')).toContainText('Match on · Leads');
  await expect(app.locator('.result .notice').first()).toContainText('Removed 1 row');
  await app.locator('.result__actions .button--primary').click();
  await expect(app.locator('.table tbody tr')).toHaveCount(1);

  // Save the step as a recipe, undo, and replay it: the second list is still open.
  await app.getByRole('button', { name: 'Recipes', exact: true }).click();
  await app.locator('.side input[type="text"]').first().fill('Without leads');
  await app.locator('.side').getByRole('button', { name: 'Save', exact: true }).click();
  await app.locator('.toolbar').getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(app.locator('.table tbody tr')).toHaveCount(2);
  await app.locator('.side').getByRole('button', { name: /^Apply/ }).first().click();
  await expect(app.locator('.table tbody tr')).toHaveCount(1);
});
