import { expect, test } from './fixtures';
import { randomUUID } from 'node:crypto';

test('shows a scenario-created payment on the dashboard', async ({
  page,
  scenario,
}) => {
  const label = `dashboard-${randomUUID()}`;

  const payment = await scenario.payments.userWithUpcomingPayment({
    label,
  });

  await page.goto('/');

  await expect(page.getByText(payment.obligation.name)).toBeVisible();
  await expect(page.getByText('R 1250.00')).toBeVisible();
});
