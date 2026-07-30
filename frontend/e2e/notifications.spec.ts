import { expect, test } from './fixtures';

test('clicking an unread notification will mark it as read', async ({
  page,
  scenario,
}) => {
  await scenario.notifications.userWithInboxItems([
    { title: 'E2E inbox mark as read', readAt: null },
  ]);

  await page.goto('/notifications');

  const row = page.getByRole('button', {
    name: 'E2E inbox mark as read, unread',
  });
  await expect(row).toBeVisible();

  await row.click();

  await expect(
    page.getByRole('button', { name: 'E2E inbox mark as read' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'E2E inbox mark as read, unread' }),
  ).toHaveCount(0);
});

test('selecting and deleting a notification in manage mode will remove it from the list', async ({
  page,
  scenario,
}) => {
  await scenario.notifications.userWithInboxItems([
    { title: 'E2E inbox delete', readAt: null },
  ]);

  await page.goto('/notifications');

  const row = page.getByRole('button', { name: 'E2E inbox delete, unread' });
  await expect(row).toBeVisible();

  await page.getByRole('button', { name: 'Manage', exact: true }).click();
  await row.click();

  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm delete', exact: true }).click();

  await expect(
    page.getByRole('button', { name: 'E2E inbox delete, unread' }),
  ).toHaveCount(0);
});
