import { randomUUID } from 'node:crypto';
import { createE2eAccessToken } from '../../../test-support/auth/e2e-auth';
import { createReceiptScan } from '../../../test-support/factories/receipt-scan';
import { createUserWithUpcomingPayment } from '../../../test-support/scenarios/payments';
import { createApiE2eFixture } from './fixtures';

describe('Receipts E2E', () => {

    it('Testing the services ability to reccord a full payment for an existing obligation', async () => {

        const e2e = await createApiE2eFixture();

        try {
            const { user, occurrence } = await createUserWithUpcomingPayment(e2e.prisma);

            const scan = await createReceiptScan(e2e.prisma,
                {
                    userId: user.id,
                    preselectedOccurrenceId: occurrence.id,
                    amount: '1250.00',
                }
            );

            const token = await createE2eAccessToken(user);

            const response = await e2e.request
                .post(`/api/v1/receipts/scans/${scan.id}/confirm`)
                .set('Authorization', `Bearer ${token}`)
                .set('Idempotency-Key', randomUUID())
                .send(
                    {
                        occurrenceId: occurrence.id,
                        amount: '1250.00',
                        currency: 'ZAR',
                        paidDate: '2026-09-27',
                        acknowledged: true,
                    }
                )
                .expect(201);

            const body = response.body.data;

            expect(body.replayed).toBe(false);

            expect(body.contribution).toEqual(expect.objectContaining({
                occurrenceId: occurrence.id,
                amount: '1250.00',
                currency: 'ZAR',
                source: 'RECEIPT_SCAN',
                receiptScanId: scan.id,
            }),
            );

            expect(body.occurrence.status).toBe('PAID');
            expect(body.occurrence.amountPaid).toBe('1250.00');
            expect(body.occurrence.amountRemaining).toBe('0.00');

            const storedOccurrence = await e2e.prisma.paymentOccurrence.findUnique(
                {
                    where: {
                        id: occurrence.id,
                    },
                }
            );

            expect(storedOccurrence?.status).toBe('PAID');
            expect(storedOccurrence?.amountPaid.toFixed(2)).toBe('1250.00');

            const storedScan = await e2e.prisma.receiptScan.findUnique(
                {
                    where: {
                        id: scan.id,
                    },
                }
            );

            expect(storedScan?.status).toBe('CONSUMED');
            expect(storedScan?.consumedAt).not.toBeNull();

        }

        finally {
            await e2e.close();
        }
    });






});