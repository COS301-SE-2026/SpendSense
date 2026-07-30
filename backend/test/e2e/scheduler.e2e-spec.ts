import {
  createUserWithDueReminder,
  createUserWithMissedEligibleOccurrence,
  createUserWithOverdueEligibleOccurrence,
} from '../../../test-support/scenarios/scheduler';
import { createApiE2eFixture } from './fixtures';

const TEST_SECRET = 'e2e-tester-secret';

describe('Scheduler E2E', () => {
  const originalSecret = process.env.SCHEDULER_SECRET;

  beforeEach(() => {
    process.env.SCHEDULER_SECRET = TEST_SECRET;
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.SCHEDULER_SECRET;
      return;
    }
    process.env.SCHEDULER_SECRET = originalSecret;
  });

  it('will transition a PENDING occurrence to OVERDUE and then notifies the user', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user, occurrence } =
        await createUserWithOverdueEligibleOccurrence(e2e.prisma);

      await e2e.request
        .post('/api/v1/scheduler/run')
        .set('x-scheduler-secret', TEST_SECRET)
        .expect(201);

      const stored = await e2e.prisma.paymentOccurrence.findUnique({
        where: { id: occurrence.id },
      });
      expect(stored?.status).toBe('OVERDUE');
      expect(stored?.overdueAt).not.toBeNull();

      const notification = await e2e.prisma.notification.findFirst({
        where: {
          userId: user.id,
          sourceId: occurrence.id,
          type: 'PAYMENT_STATUS',
        },
      });
      expect(notification).not.toBeNull();
    } finally {
      await e2e.close();
    }
  });

  it('will transition an overdue occurrence to MISSED and then notifies the user', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user, occurrence } =
        await createUserWithMissedEligibleOccurrence(e2e.prisma);

      await e2e.request
        .post('/api/v1/scheduler/run')
        .set('x-scheduler-secret', TEST_SECRET)
        .expect(201);

      const stored = await e2e.prisma.paymentOccurrence.findUnique({
        where: { id: occurrence.id },
      });
      expect(stored?.status).toBe('MISSED');
      expect(stored?.missedAt).not.toBeNull();

      const notification = await e2e.prisma.notification.findFirst({
        where: {
          userId: user.id,
          sourceId: occurrence.id,
          type: 'PAYMENT_STATUS',
        },
      });
      expect(notification).not.toBeNull();
    } finally {
      await e2e.close();
    }
  });

  it('will process a due reminder into a REMINDER notification and marks it as SENT', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user, reminder } = await createUserWithDueReminder(e2e.prisma);

      await e2e.request
        .post('/api/v1/scheduler/run')
        .set('x-scheduler-secret', TEST_SECRET)
        .expect(201);

      const storedReminder = await e2e.prisma.reminder.findUnique({
        where: { id: reminder.id },
      });
      expect(storedReminder?.status).toBe('SENT');
      expect(storedReminder?.sentAt).not.toBeNull();

      const notification = await e2e.prisma.notification.findFirst({
        where: { userId: user.id, type: 'REMINDER' },
      });
      expect(notification).not.toBeNull();
    } finally {
      await e2e.close();
    }
  });
});
