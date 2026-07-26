import { test } from '@playwright/test';

const token = process.env.E2E_ACCESS_TOKEN;
const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:3001/api/v1';

test('creates authenticated E2E browser storage state', async ({ page }) => {
  if (!token) {
    throw new Error('E2E_ACCESS_TOKEN must be provided by the E2E test command.');
  }

  const response = await fetch(`${apiUrl}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Could not initialise the E2E user: ${response.status}`);
  }

  await page.addInitScript((accessToken) => {
    localStorage.setItem('spendsense_access_token', accessToken);
  }, token);
  await page.goto('/');
  await page.context().storageState({ path: 'playwright/.auth/e2e-user.json' });
});
