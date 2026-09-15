import { expect, test as base, type Page } from '@playwright/test';

/** Where the app lives on the dev server — the same path as on GitHub Pages. */
export const APP = '/ListTool/';

/**
 * Every test gets the app open on an empty workspace and ends with the same two
 * promises checked: no request left the origin, and nothing threw in the console.
 * Those are the privacy rule and the no-broken-page rule, so they are not opt-in.
 */
export const test = base.extend<{ app: Page }>({
  app: async ({ page }, use) => {
    const outside: string[] = [];
    const errors: string[] = [];
    let origin = '';

    page.on('request', (request) => {
      if (origin !== '' && new URL(request.url()).origin !== origin) outside.push(request.url());
    });
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(String(error)));

    await page.goto(APP);
    origin = new URL(page.url()).origin;
    await use(page);

    expect(outside, 'requests outside the origin').toEqual([]);
    expect(errors, 'console errors').toEqual([]);
  },
});

export { expect };
