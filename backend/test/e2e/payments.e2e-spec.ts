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
    // extening response to include the credit-score impoact
    scoreImpact: {
      scoreEventId: string;
      previousScore: number;
      currentScore: number;
      delta: number;
      tierBefore: string;
      tierAfter: string;
      explanation: string;
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

      const profileBefore = await e2e.prisma.creditProfile.findUnique({
        where: {
          userId: user.id,
        },
      });

      const expectedScoreBefore = profileBefore?.currentScore ?? 600;

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

      expect(body.data.scoreImpact.previousScore).toBe(expectedScoreBefore);
      expect(body.data.scoreImpact.delta).toBe(
        body.data.scoreImpact.currentScore -
          body.data.scoreImpact.previousScore,
      );

      const storedOccurrence = await e2e.prisma.paymentOccurrence.findUnique({
        where: { id: occurrence.id },
      });
      expect(storedOccurrence?.status).toBe('PAID');

      // PaymentRecord
      const storedPayment = await e2e.prisma.paymentRecord.findUnique({
        where: {
          occurrenceId: occurrence.id,
        },
      });
      expect(storedPayment).not.toBeNull();
      expect(storedPayment?.paymentStatus).toBe('ON_TIME');

      // CreditProfile Assesment:
      // now chking if our API response has a generated presisted creditProfile state
      const storedProfile = await e2e.prisma.creditProfile.findUnique({
        where: {
          userId: user.id,
        },
      });

      expect(storedProfile).not.toBeNull(); // profile should definitly exist
      expect(storedProfile?.previousScore).toBe(expectedScoreBefore); // the stored prev score should equal the score before the update
      expect(storedProfile?.currentScore).toBe(
        body.data.scoreImpact.currentScore,
      ); // same with current score (after the imact)
      expect(storedProfile?.currentScore).toBe(
        storedProfile!.previousScore + body.data.scoreImpact.delta,
      ); // chek th emaths
      expect(storedProfile?.lastCalculatedAt).not.toBeNull();

      // ScoreEvent assesment
      const storedScoreEvent = await e2e.prisma.scoreEvent.findUnique({
        where: {
          id: body.data.scoreImpact.scoreEventId,
        },
      });

      expect(storedScoreEvent).not.toBeNull();

      expect(storedScoreEvent).toEqual(
        expect.objectContaining({
          userId: user.id,
          occurrenceId: occurrence.id,
          paymentRecordId: storedPayment?.id,
          eventType: 'PAYMENT_ON_TIME',
          scoreBefore: expectedScoreBefore,
          scoreAfter: body.data.scoreImpact.currentScore,
          pointsDelta: body.data.scoreImpact.delta,
        }),
      );
      expect(storedScoreEvent!.pointsDelta).toBe(
        storedScoreEvent!.scoreAfter - storedScoreEvent!.scoreBefore,
      ); // again just to double check the maths
    } finally {
      await e2e.close();
    }
  });
});
