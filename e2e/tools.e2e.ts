import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { applyTool, importText, openTools, pickTool, undoButton } from './helpers';

const PEOPLE = ['name\tcity', 'bo\tStockholm', 'anna\tGöteborg', 'carl\tGöteborg', 'dora\tMalmö'].join(
  '\n',
);

function names(page: Page) {
  return page.locator('.table tbody tr td:nth-child(3)');
}

function tick(page: Page, row: number) {
  return page.locator('.table tbody tr').nth(row).locator('input[type=checkbox]').check();
}

function scopeBox(page: Page) {
  return page.locator('.scope input[type=checkbox]');
}

test('a tool runs on the ticked rows only, and the step says so', async ({ app }) => {
  await importText(app, PEOPLE, 'People');
  await tick(app, 0);
  await tick(app, 2);
  await pickTool(app, 'Change case');
  await expect(scopeBox(app)).toBeChecked();
  await expect(app.locator('.scope')).toContainText('Only the 2 ticked rows');
  await app.locator('#tool-change-case-mode').selectOption('upper');
  await expect(app.locator('.result .notice').first()).toContainText('on the 2 ticked rows');

  await applyTool(app);
  await expect(names(app)).toHaveText(['BO', 'anna', 'CARL', 'dora']);
  await app.locator('.side .segmented__button', { hasText: 'History' }).click();
  await expect(app.locator('.history__step').last()).toContainText('on the 2 ticked rows');
  await undoButton(app).click();
  await expect(names(app)).toHaveText(['bo', 'anna', 'carl', 'dora']);
});

test('unticking the scope runs the same tool on the whole list', async ({ app }) => {
  await importText(app, PEOPLE, 'People');
  await tick(app, 1);
  await pickTool(app, 'Change case');
  await app.locator('#tool-change-case-mode').selectOption('upper');
  await scopeBox(app).uncheck();
  await expect(app.locator('.result .notice').first()).not.toContainText('ticked');
  await applyTool(app);
  await expect(names(app)).toHaveText(['BO', 'ANNA', 'CARL', 'DORA']);
});

test('Sort on ticked rows reorders them within their own slots', async ({ app }) => {
  await importText(app, PEOPLE, 'People');
  await tick(app, 0);
  await tick(app, 2);
  await pickTool(app, 'Sort');
  await app.locator('#tool-sort-direction').selectOption('desc');
  await applyTool(app);
  // bo and carl swap places; anna and dora never move.
  await expect(names(app)).toHaveText(['carl', 'anna', 'bo', 'dora']);
});

test('a tool that reshapes the ticked rows can only go to a new list', async ({ app }) => {
  await importText(app, PEOPLE, 'People');
  await tick(app, 1);
  await tick(app, 2);
  await pickTool(app, 'Count values');
  await app.locator('#tool-count-values-column').selectOption('c2');
  await expect(app.locator('.result .notice--warning')).toContainText('can only become a new list');
  await expect(app.locator('.result__actions .button--primary')).toHaveCount(0);
  await app.getByRole('button', { name: 'Apply to new list' }).click();
  await expect(app.locator('.tab__name')).toHaveCount(2);
  await expect(app.locator('.table tbody tr')).toHaveCount(1);
  await expect(app.locator('.table tbody tr').first()).toContainText('Göteborg');
  await expect(app.locator('.table tbody tr').first()).toContainText('2');
});

test('Tools for these rows… opens the picker with the scope already on', async ({ app }) => {
  await importText(app, PEOPLE, 'People');
  await tick(app, 3);
  await app.getByRole('button', { name: 'Tools for these rows…' }).click();
  await app.getByPlaceholder('Search tools…').fill('Add prefix');
  await app.locator('.picker__tool', { hasText: 'Add prefix / suffix' }).click();
  await expect(scopeBox(app)).toBeChecked();
  await app.locator('#tool-prefix-suffix-column').selectOption('c1');
  await app.locator('#tool-prefix-suffix-prefix').fill('Dr ');
  await expect(app.locator('.result .notice').first()).toContainText('Wrapped 1 cell — on the 1 ticked row');
  await applyTool(app);
  await expect(names(app)).toHaveText(['bo', 'anna', 'carl', 'Dr dora']);
});

test('Normalise dates writes a mixed column one way', async ({ app }) => {
  const dates = ['who\twhen', 'a\t15/09/2026', 'b\t2026-09-16', 'c\t17.9.2026', 'd\t18 sep 2026'];
  await importText(app, dates.join('\n'), 'Dates');
  await pickTool(app, 'Normalise dates');
  await expect(app.locator('.result .notice').first()).toContainText('Rewrote 3 cells');
  await applyTool(app);
  await expect(app.locator('.table tbody tr td:nth-child(4)')).toHaveText([
    '2026-09-15',
    '2026-09-16',
    '2026-09-17',
    '2026-09-18',
  ]);
});

test('a personnummer with a wrong check digit is flagged, and the checkup saw it first', async ({
  app,
}) => {
  await importText(app, 'who\tid\na\t811278-9865\nb\t811278-9866\nc\t201231-2381', 'Ids');
  await openTools(app);
  await expect(app.locator('.side')).toContainText(
    '1 value looks like a Swedish ID number but does not check out',
  );
  await pickTool(app, 'Validate Swedish ID numbers');
  await app.locator('#tool-validate-swedish-ids-column').selectOption('c2');
  await applyTool(app);
  // Day 78 is 18 + 60: the first number is a valid samordningsnummer, not a typo.
  await expect(app.locator('.table tbody tr td:nth-child(5)')).toHaveText([
    'samordningsnummer',
    'no',
    'personnummer',
  ]);
});

test('Split into batches refuses to open more than thirty tabs', async ({ app }) => {
  const lines = Array.from({ length: 100 }, (_, index) => `row ${index + 1}`).join('\n');
  await importText(app, lines, 'Long');
  await pickTool(app, 'Split into batches');
  await app.locator('#tool-chunk-list-size').fill('1');
  await expect(app.locator('.result .notice--warning')).toContainText(
    'That would make 100 batches, and 30 is as many as this opens at once.',
  );
});

test('Find near-duplicates answers within a moment on ten thousand rows', async ({ app }) => {
  const lines = Array.from({ length: 10000 }, (_, index) => `Anna Andersson ${index % 4000}`).join('\n');
  await importText(app, lines, 'Big');
  await pickTool(app, 'Find near-duplicates');
  await app.locator('#tool-find-similar-threshold').fill('80');
  const started = Date.now();
  await expect(app.locator('.result .notice').first()).toContainText('contain values that are nearly the same', {
    timeout: 15000,
  });
  expect(Date.now() - started).toBeLessThan(8000);
});
