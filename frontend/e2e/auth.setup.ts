import { test } from '@playwright/test';

const token = process.env.E2E_ACCESS_TOKEN;

test('creates authenticated E2E browser storage state', async ({ page }) => {
  if (!token) {
    throw new Error('E2E_ACCESS_TOKEN must be provided by the E2E test command.');
  }

  await page.addInitScript((accessToken) => {
    localStorage.setItem('spendsense_access_token', accessToken);
  }, token);
  await page.goto('/', { waitUntil: 'commit' });
  await page.context().storageState({ path: 'playwright/.auth/e2e-user.json' });
});
