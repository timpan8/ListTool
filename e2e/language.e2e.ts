import { expect, test } from './fixtures';
import { importText } from './helpers';

test('switching to Swedish reloads the page in Swedish, and back again', async ({ app }) => {
  await importText(app, 'name\tcity\nAnna\tGöteborg\nBo\tStockholm', 'Kunder');
  await expect(app.locator('html')).toHaveAttribute('lang', 'en');

  await app.getByRole('button', { name: 'Settings', exact: true }).click();
  await app.locator('#settings-language').selectOption('sv');
  await app.waitForLoadState('load');

  await expect(app.locator('html')).toHaveAttribute('lang', 'sv');
  await expect(app.getByRole('button', { name: 'Importera', exact: true }).first()).toBeVisible();
  await expect(app.getByRole('button', { name: 'Verktyg', exact: true }).first()).toBeVisible();
  await expect(app.getByRole('button', { name: 'Jämför', exact: true })).toBeVisible();
  // The list survived the reload, and the status bar counts in Swedish.
  await expect(app.locator('.table tbody tr')).toHaveCount(2);
  await expect(app.locator('.statusbar__stats')).toContainText('2 rader');

  // The picker, a tool's form and its summary read in Swedish too.
  await app.getByRole('button', { name: 'Verktyg', exact: true }).first().click();
  await expect(app.locator('.side')).toContainText('Städa');
  await app.getByPlaceholder('Sök verktyg…').fill('dubbletter');
  await app.locator('.picker__tool', { hasText: 'Ta bort dubbletter' }).click();
  await expect(app.locator('.result')).toContainText('Bortse från skiftläge');
  await expect(app.locator('.result .notice').first()).toContainText('Inget ändrades.');
  await expect(app.getByRole('button', { name: 'Verkställ', exact: true })).toBeVisible();

  // Compare mode speaks Swedish as well.
  await app.getByRole('button', { name: 'Jämför', exact: true }).click();
  await expect(app.locator('main')).toContainText('Jämför behöver två listor');

  await app.getByRole('button', { name: 'Inställningar', exact: true }).click();
  await app.locator('#settings-language').selectOption('en');
  await app.waitForLoadState('load');
  await expect(app.locator('html')).toHaveAttribute('lang', 'en');
  await expect(app.getByRole('button', { name: 'Import', exact: true }).first()).toBeVisible();
});
