import { expect, test } from './fixtures';

test('changing the reminder days pill saves and persists after a reload', async ({
  page,
  scenario,
}) => {
  await scenario.reminders.userWithPreferences({
    defaultReminderDaysBefore: 3,
  });

  await page.goto('/settings/notifications');

  const sevenDaysButton = page.getByRole('button', { name: '7 days' });
  await expect(sevenDaysButton).toBeVisible();
  await sevenDaysButton.click();

  await expect(page.getByText('reminder settings saved')).toBeVisible();
  await expect(sevenDaysButton).toHaveAttribute('aria-pressed', 'true');

  await page.reload();

  await expect(page.getByRole('button', { name: '7 days' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('toggling in app notifications saves and persists after a reload', async ({
  page,
  scenario,
}) => {
  await scenario.reminders.userWithPreferences({
    inAppEnabled: true,
  });

  await page.goto('/settings/notifications');

  const inAppSwitch = page.getByRole('switch', { name: 'In App Notifications' });
  await expect(inAppSwitch).toHaveAttribute('aria-checked', 'true');

  await inAppSwitch.click();

  await expect(page.getByText('reminder settings saved')).toBeVisible();
  await expect(inAppSwitch).toHaveAttribute('aria-checked', 'false');

  await page.reload();

  await expect(
    page.getByRole('switch', { name: 'In App Notifications' }),
  ).toHaveAttribute('aria-checked', 'false');
});
