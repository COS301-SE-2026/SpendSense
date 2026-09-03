import { expect, test } from './fixtures';
import { randomUUID } from 'node:crypto';

test('clicking an unread notification will mark it as read', async ({
  page,
  scenario,
}) => {
  const title = `E2E inbox mark as read ${randomUUID()}`;

  await scenario.notifications.userWithInboxItems([
    { title, readAt: null },
  ]);

  await page.goto('/notifications');

  const row = page.getByRole('button', {
    name: `${title}, unread`,
  });
  await expect(row).toBeVisible();

  await row.click();

  await expect(
    page.getByRole('button', { name: title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: `${title}, unread` }),
  ).toHaveCount(0);
});

test('selecting and deleting a notification in manage mode will remove it from the list', async ({
  page,
  scenario,
}) => {
  const title = `E2E inbox delete ${randomUUID()}`;

  await scenario.notifications.userWithInboxItems([
    { title, readAt: null },
  ]);

  await page.goto('/notifications');

  const row = page.getByRole('button', { name: `${title}, unread` });
  await expect(row).toBeVisible();

  await page.getByRole('button', { name: 'Manage', exact: true }).click();
  await row.click();

  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm delete', exact: true }).click();

  await expect(
    page.getByRole('button', { name: `${title}, unread` }),
  ).toHaveCount(0);
});
