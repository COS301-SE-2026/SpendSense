import { createE2eAccessToken } from '../../../test-support/auth/e2e-auth';
import { createUserWithUpcomingPayment } from '../../../test-support/scenarios/payments';
import { createApiE2eFixture } from './fixtures';

type LogPaymentResponse = {
  data: {
    payment: {
      occurrenceId: string;
      paymentStatus: string;
    };
    occurrence: {
      status: string;
    };
  };
};

describe('Payments E2E', () => {
  it('logs an on-time payment for a scenario-created occurrence', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user, occurrence } = await createUserWithUpcomingPayment(
        e2e.prisma,
      );
      const token = await createE2eAccessToken(user);

      const response = await e2e.request
        .post('/api/v1/payments/log')
        .set('Authorization', `Bearer ${token}`)
        .send({
          occurrenceId: occurrence.id,
          paidDate: '2030-01-15',
          amountPaid: 1250,
          notes: 'Paid through the E2E scenario.',
        })
        .expect(201);

      const body = response.body as LogPaymentResponse;
      expect(body.data.payment.occurrenceId).toBe(occurrence.id);
      expect(body.data.payment.paymentStatus).toBe('ON_TIME');
      expect(body.data.occurrence.status).toBe('PAID');

      const storedOccurrence = await e2e.prisma.paymentOccurrence.findUnique({
        where: { id: occurrence.id },
      });
      expect(storedOccurrence?.status).toBe('PAID');
    } finally {
      await e2e.close();
    }
  });
});
