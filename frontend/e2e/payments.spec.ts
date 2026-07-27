import { expect, test } from './fixtures';

test('shows a scenario-created payment on the dashboard', async ({
  page,
  scenario,
}) => {
  const payment = await scenario.payments.userWithUpcomingPayment({
    label: 'dashboard',
  });

  await page.goto('/');

  await expect(page.getByText(payment.obligation.name)).toBeVisible();
  await expect(page.getByText('R 1250.00')).toBeVisible();
});
