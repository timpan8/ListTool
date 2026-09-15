import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { importText } from './helpers';

const PEOPLE = [
  'name\tcity\temail',
  'Anna\tGöteborg\tanna@example.com',
  'Bo\tStockholm\tbo@example.com',
  'Carl\tGöteborg\tcarl@example.com',
].join('\n');

/** Both clipboard flavours, read back from the browser. */
async function clipboard(page: Page): Promise<{ text: string; html: string }> {
  return page.evaluate(async () => {
    const [item] = await navigator.clipboard.read();
    if (item === undefined) return { text: '', html: '' };
    const text = await (await item.getType('text/plain')).text();
    const html = item.types.includes('text/html')
      ? await (await item.getType('text/html')).text()
      : '';
    return { text, html };
  });
}

function notice(page: Page) {
  return page.locator('.statusbar__notice');
}

function search(page: Page) {
  return page.getByPlaceholder('Search in view…');
}

function tick(page: Page, row: number) {
  return page.locator('.table tbody tr').nth(row).locator('input[type=checkbox]').check();
}

test('Copy takes every column of the rows the search shows, as a table', async ({ app }) => {
  await importText(app, PEOPLE, 'People');
  await search(app).fill('stock');
  await expect(app.locator('.table tbody tr')).toHaveCount(1);

  await app.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(notice(app)).toHaveText('Copied the 1 row shown as a table with 3 columns');

  const copied = await clipboard(app);
  expect(copied.text).toBe('name\tcity\temail\nBo\tStockholm\tbo@example.com');
  expect(copied.html).toContain('<table>');
  expect(copied.html).toContain('<td>Stockholm</td>');
  expect(copied.html.match(/<td>/g)).toHaveLength(3);
});

test('ticked rows win over the search, and Ctrl+C does the same as Copy', async ({ app }) => {
  await importText(app, PEOPLE, 'People');
  await tick(app, 0);
  await tick(app, 2);
  await search(app).fill('stock');
  await expect(app.locator('.table tbody tr')).toHaveCount(1);

  // Focus leaves the search box first: Ctrl+C inside a field is the field's own copy.
  await app.locator('.app__name').click();
  await app.keyboard.press('Control+c');
  await expect(notice(app)).toHaveText('Copied the 2 ticked rows as a table with 3 columns');

  const copied = await clipboard(app);
  expect(copied.text).toBe(
    'name\tcity\temail\nAnna\tGöteborg\tanna@example.com\nCarl\tGöteborg\tcarl@example.com',
  );
});

test('a one-column list copies as lines', async ({ app }) => {
  await importText(app, 'alpha\nbeta\ngamma', 'Words');
  await app.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(notice(app)).toHaveText('Copied the 3 rows shown as Lines');
  expect((await clipboard(app)).text).toBe('alpha\nbeta\ngamma');
});

test('the export dialog offers the shown, ticked or all rows and remembers the format', async ({
  app,
}) => {
  await importText(app, PEOPLE, 'People');
  await search(app).fill('göteborg');
  await expect(app.locator('.table tbody tr')).toHaveCount(2);
  await tick(app, 0);

  await app.getByRole('button', { name: 'Export', exact: true }).click();
  const rows = app.locator('#export-rows');
  await expect(rows.locator('option')).toHaveText(['Shown (2)', 'Ticked (1)', 'All (3)']);
  await expect(rows).toHaveValue('ticked');
  await expect(app.locator('.preview__text')).toHaveText(/^name\tcity\temail\nAnna\t/);

  await rows.selectOption('all');
  await app.locator('#export-format').selectOption('csv');
  await expect(app.locator('.preview__text')).toHaveText(
    'name,city,email\nAnna,Göteborg,anna@example.com\nBo,Stockholm,bo@example.com\nCarl,Göteborg,carl@example.com',
  );
  await app.locator('.dialog__actions .button--primary').click();
  await expect(notice(app)).toHaveText('Copied all 3 rows as a table with 3 columns');
  expect((await clipboard(app)).text).toContain('Bo,Stockholm');

  // The format is remembered, the rows are asked again.
  await app.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(app.locator('#export-format')).toHaveValue('csv');
  await expect(app.locator('#export-rows')).toHaveValue('ticked');
  await app.keyboard.press('Escape');
});

test('the palette copies in the format named, over the same rows', async ({ app }) => {
  await importText(app, PEOPLE, 'People');
  await tick(app, 1);
  await app.locator('.app__name').click();
  await app.keyboard.press('Control+k');
  await app.getByPlaceholder('Search tools, parsers and formats…').fill('copy as json');
  await app.keyboard.press('Enter');
  await expect(notice(app)).toHaveText('Copied the 1 ticked row as JSON array');
  // The JSON exporter writes one column by default: the ticked row's name, nobody else's.
  const copied = (await clipboard(app)).text;
  expect(copied).toContain('"Bo"');
  expect(copied).not.toContain('Anna');
});
