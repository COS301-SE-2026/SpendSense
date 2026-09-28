type StoredReceiptScan = {
    id: string;
    userId: string;
    status: string;
};

export type ReceiptScanStore = {
    receiptScan: {
        create: (args: {
            data: Record<string, unknown>;
        }) => Promise<StoredReceiptScan>;
    };
};

export type ReceiptScanInput = {
    userId: string;
    preselectedOccurrenceId?: string;
    amount?: string;
    merchant?: string;
    receiptDate?: string;
    status?: 'READY_FOR_REVIEW' | 'CONSUMED' | 'EXPIRED';
    expiresAt?: Date;
};

export async function createReceiptScan(prisma: ReceiptScanStore, input: ReceiptScanInput) {

    return prisma.receiptScan.create(
        {
            data: {
                userId: input.userId,
                status: input.status ?? 'READY_FOR_REVIEW',
                preselectedOccurrenceId: input.preselectedOccurrenceId ?? null,

                extraction: {
                    amountCandidates: [
                        {
                            value: input.amount ?? '1250.00',
                            currency: 'ZAR',
                            confidence: 'HIGH',
                            label: 'Total',
                        },
                    ],

                    merchant: {
                        value: input.merchant ?? 'E2E Merchant',
                        confidence: 'HIGH',
                    },

                    receiptDate: {
                        value: input.receiptDate ?? '2026-09-27',
                        confidence: 'HIGH',
                    },

                    warnings: [],
                },

                warnings: [],

                expiresAt: input.expiresAt ?? new Date(Date.now() + 15 * 60 * 1000),
            },
        }
    );
}