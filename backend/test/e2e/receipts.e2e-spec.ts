import { randomUUID } from 'node:crypto';
import { createE2eAccessToken } from '../../../test-support/auth/e2e-auth';
import { createReceiptScan } from '../../../test-support/factories/receipt-scan';
import { createUserWithUpcomingPayment } from '../../../test-support/scenarios/payments';
import { createApiE2eFixture } from './fixtures';

type ReceiptContributionResponse = {
  occurrenceId?: string;
  obligationId: string;
  amount: string;
  currency: string;
  source: string;
  receiptScanId: string;
};

type ReceiptOccurrenceResponse = {
  status: string;
  amountPaid: string;
  amountRemaining: string;
};

type ReceiptResponseData = {
  replayed: boolean;
  contribution: ReceiptContributionResponse;
  occurrence: ReceiptOccurrenceResponse;
};

type ReceiptApiResponse = {
  data: ReceiptResponseData;
};

type ErrorApiResponse = {
  message: string;
};

function createOccurrenceReceiptScan(
  prisma: Parameters<typeof createReceiptScan>[0],
  userId: string,
  occurrenceId: string,
  amount: string,
) {
  return createReceiptScan(prisma, {
    userId,
    preselectedOccurrenceId: occurrenceId,
    amount,
  });
}

function createPaymentBody(occurrenceId: string, amount: string) {
  return {
    occurrenceId,
    amount,
    currency: 'ZAR',
    paidDate: '2026-09-27',
    acknowledged: true,
  };
}

function confirmReceipt(
  e2e: Awaited<ReturnType<typeof createApiE2eFixture>>,
  scanId: string,
  token: string,
  occurrenceId: string,
  amount: string,
  expectedStatus = 201,
) {
  return e2e.request
    .post(`/api/v1/receipts/scans/${scanId}/confirm`)
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', randomUUID())
    .send(createPaymentBody(occurrenceId, amount))
    .expect(expectedStatus);
}

function getStoredOccurrence(
  e2e: Awaited<ReturnType<typeof createApiE2eFixture>>,
  occurrenceId: string,
) {
  return e2e.prisma.paymentOccurrence.findUnique({
    where: {
      id: occurrenceId,
    },
  });
}

function getStoredReceiptScan(
  e2e: Awaited<ReturnType<typeof createApiE2eFixture>>,
  scanId: string,
) {
  return e2e.prisma.receiptScan.findUnique({
    where: {
      id: scanId,
    },
  });
}
describe('Receipts E2E', () => {



  it('Testing the service ability to record a partial payment for an existing obligation', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user, occurrence } = await createUserWithUpcomingPayment(
        e2e.prisma,
      );

      const scan = await createOccurrenceReceiptScan(
        e2e.prisma,
        user.id,
        occurrence.id,
        '500.00',
      );

      const token = await createE2eAccessToken(user);

      const response = await confirmReceipt(
        e2e,
        scan.id,
        token,
        occurrence.id,
        '500.00',
      );

      const { data: body } = response.body as ReceiptApiResponse;

      expect(body.occurrence.status).toBe('PARTIALLY_PAID');
      expect(body.occurrence.amountPaid).toBe('500.00');
      expect(body.occurrence.amountRemaining).toBe('750.00');

      const storedOccurrence = await getStoredOccurrence(e2e, occurrence.id);

      expect(storedOccurrence?.status).toBe('PARTIALLY_PAID');
      expect(storedOccurrence?.amountPaid.toFixed(2)).toBe('500.00');

      const storedScan = await getStoredReceiptScan(e2e, scan.id);

      expect(storedScan?.status).toBe('CONSUMED');
    } finally {
      await e2e.close();
    }
  });

  it('Testing that the service correctly responds with an error when the user tries to rescan a receipt that has already been consumed', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user, occurrence } = await createUserWithUpcomingPayment(
        e2e.prisma,
      );

      const scan = await createOccurrenceReceiptScan(
        e2e.prisma,
        user.id,
        occurrence.id,
        '500.00',
      );

      const token = await createE2eAccessToken(user);

      await confirmReceipt(e2e, scan.id, token, occurrence.id, '500.00');

      const response = await confirmReceipt(
        e2e,
        scan.id,
        token,
        occurrence.id,
        '500.00',
        409,
      );

      const errorBody = response.body.message as ErrorApiResponse;

      expect(errorBody).toBe('Receipt scan has already been consumed.');
    } finally {
      await e2e.close();
    }
  });

  it('Testing the creation of a once-off obligation from the scanning of a receipt', async () => {
    const e2e = await createApiE2eFixture();

    try {
      const { user } = await createUserWithUpcomingPayment(e2e.prisma);

      const category = await e2e.prisma.category.findFirst({
        where: {
          name: 'Rent',
          type: 'OBLIGATION',
        },
      });

      expect(category).not.toBeNull();

      const scan = await createReceiptScan(e2e.prisma, {
        userId: user.id,
        amount: '350.00',
        merchant: 'E2E Woolworths',
      });

      const token = await createE2eAccessToken(user);

      const response = await e2e.request
        .post(`/api/v1/receipts/scans/${scan.id}/create-obligation`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({
          name: 'E2E Woolworths',
          categoryId: category!.id,
          type: 'CUSTOM',
          priority: 'LOW',
          amount: 350,
          currency: 'ZAR',
          frequency: 'ONCE',
          acknowledged: true,
        })
        .expect(201);

      const { data: body } = response.body as ReceiptApiResponse;

      expect(body.replayed).toBe(false);

      expect(body.contribution).toEqual(
        expect.objectContaining({
          amount: '350.00',
          currency: 'ZAR',
          source: 'RECEIPT_SCAN',
          receiptScanId: scan.id,
        }),
      );

      expect(body.occurrence.status).toBe('PAID');
      expect(body.occurrence.amountPaid).toBe('350.00');
      expect(body.occurrence.amountRemaining).toBe('0.00');

      const obligation = await e2e.prisma.financialObligation.findUnique({
        where: {
          id: body.contribution.obligationId,
        },
      });

      expect(obligation).not.toBeNull();
      expect(obligation?.name).toBe('E2E Woolworths');
      expect(obligation?.amount.toFixed(2)).toBe('350.00');
      expect(obligation?.currency).toBe('ZAR');

      const storedScan = await getStoredReceiptScan(e2e, scan.id);

      expect(storedScan?.status).toBe('CONSUMED');
      expect(storedScan?.consumedAt).not.toBeNull();
    } finally {
      await e2e.close();
    }
  });
});
