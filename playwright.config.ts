import { defineConfig } from '@playwright/test';

/**
 * The in-repo browser suite: Chromium only, one worker, no retries — a flaky test is a
 * bug to fix, not a die to roll again. The dev server is started from here, so
 * `npm run e2e` is the whole command; a server already on the port is reused.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    permissions: ['clipboard-read', 'clipboard-write'],
    viewport: { width: 1280, height: 900 },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npx vite --port 5173 --strictPort',
    url: 'http://localhost:5173/ListTool/',
    reuseExistingServer: true,
  },
});
