type StoredObligation = {
    id: string;
    name: string;
    type: string;
    priority: string;
};

type StoredSchedule = {
    id: string;
    obligationId: string;
};

type StoredOccurrence = {
    id: string;
    userId: string;
    obligationId: string;
    scheduleId: string;
    dueDate: Date;
    amountDue: unknown;
    status: string;
};

type StoredPaymentRecord = {
    id: string;
    occurrenceId: string;
    paymentStatus: string;
};

export type FinancialHealthStore = {
    financialObligation: {
        create: (args: {
            data: Record<string, unknown>;
        }) => Promise<StoredObligation>;
    };
    paymentSchedule: {
        create: (args: {
            data: Record<string, unknown>;
        }) => Promise<StoredSchedule>;
    };
    paymentOccurrence: {
        create: (args: {
            data: Record<string, unknown>;
        }) => Promise<StoredOccurrence>;
    };
    paymentRecord: {
        create: (args: {
            data: Record<string, unknown>;
        }) => Promise<StoredPaymentRecord>;
    };
};

export type ObligationType = | 'RENT' | 'SUBSCRIPTION' | 'BNPL' | 'UTILITY' | 'IOU' | 'CUSTOM';
export type ObligationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PaymentOccurrenceStatus = | 'PENDING' | 'PAID' | 'PAID_LATE' | 'OVERDUE' | 'MISSED' | 'CANCELLED';
export type PaymentRecordStatus = 'ON_TIME' | 'LATE';

export type CreateObligationInput = {
    userId: string;
    categoryId: string;
    name: string;
    type: ObligationType;
    amount: number;
    priority?: ObligationPriority;
    startDate: Date;
    frequency?: 'ONCE' | 'WEEKLY' | 'MONTHLY' | 'FIXED_INSTALLMENT';
};

export async function createObligationWithSchedule(prisma: FinancialHealthStore, input: CreateObligationInput) {
    const obligation = await prisma.financialObligation.create({
        data: {
            userId: input.userId,
            categoryId: input.categoryId,
            name: input.name,
            type: input.type,
            status: 'ACTIVE',
            amount: input.amount,
            currency: 'ZAR',
            priority: input.priority ?? 'MEDIUM',
            startDate: input.startDate,
        },
    });

    const schedule = await prisma.paymentSchedule.create({
        data: {
            obligationId: obligation.id,
            frequency: input.frequency ?? 'MONTHLY',
            startDate: input.startDate,
        },
    });

    return {
        obligation,
        schedule,
    };
}

export type CreateOccurrenceInput = {
    userId: string;
    obligationId: string;
    scheduleId: string;
    dueDate: Date;
    amountDue: number;
    sequenceNumber: number;
    status?: PaymentOccurrenceStatus;
    paidAt?: Date;
    overdueAt?: Date;
    missedAt?: Date;
};

export async function createFinancialOccurrence(prisma: FinancialHealthStore, input: CreateOccurrenceInput) {
    return prisma.paymentOccurrence.create({
        data: {
            userId: input.userId,
            obligationId: input.obligationId,
            scheduleId: input.scheduleId,
            dueDate: input.dueDate,
            amountDue: input.amountDue,
            currency: 'ZAR',
            status: input.status ?? 'PENDING',
            sequenceNumber: input.sequenceNumber,
            paidAt: input.paidAt,
            overdueAt: input.overdueAt,
            missedAt: input.missedAt,
        },
    });
}

export type CreateResolvedPaymentInput = {
    userId: string;
    obligationId: string;
    scheduleId: string;
    dueDate: Date;
    amountDue: number;
    sequenceNumber: number;
    paymentStatus: PaymentRecordStatus;
    paidDate?: Date;
    daysLate?: number;
    notes?: string;
};

export async function createResolvedPayment(prisma: FinancialHealthStore, input: CreateResolvedPaymentInput) {

    const daysLate = input.paymentStatus === 'LATE' ? (input.daysLate ?? 2) : 0;
    const paidDate = input.paidDate ?? new Date(input.dueDate.getTime() + daysLate * 24 * 60 * 60 * 1000);

    const occurrence = await createFinancialOccurrence(prisma, {
        userId: input.userId,
        obligationId: input.obligationId,
        scheduleId: input.scheduleId,
        dueDate: input.dueDate,
        amountDue: input.amountDue,
        sequenceNumber: input.sequenceNumber,
        status: input.paymentStatus === 'ON_TIME' ? 'PAID' : 'PAID_LATE',
        paidAt: paidDate,
    });

    const paymentRecord = await prisma.paymentRecord.create({
        data: {
            userId: input.userId,
            occurrenceId: occurrence.id,
            obligationId: input.obligationId,
            amountPaid: input.amountDue,
            currency: 'ZAR',
            paidDate,
            paymentStatus: input.paymentStatus,
            daysLate,
            simulatedInterest: 0,
            notes: input.notes ?? 'Created by an E2E financial-health factory.',
        },
    });

    return {
        occurrence,
        paymentRecord,
    };
}
