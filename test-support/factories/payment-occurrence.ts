type StoredRecord = { id: string };

export type PaymentOccurrenceStore = {
  financialObligation: {
    create: (args: { data: Record<string, unknown> }) => Promise<StoredRecord>;
  };
  paymentSchedule: {
    create: (args: { data: Record<string, unknown> }) => Promise<StoredRecord>;
  };
  paymentOccurrence: {
    create: (args: { data: Record<string, unknown> }) => Promise<StoredRecord>;
  };
};

export type PaymentOccurrenceInput = {
  userId: string;
  categoryId: string;
  obligationName?: string;
  amountDue?: number;
  dueDate?: Date;
  status?: 'PENDING' | 'PAID' | 'PAID_LATE' | 'OVERDUE' | 'MISSED' | 'CANCELLED';
  overdueAt?: Date;
  missedAt?: Date;
};

export async function createPaymentOccurrence(
  prisma: PaymentOccurrenceStore,
  input: PaymentOccurrenceInput,
) {
  const amountDue = input.amountDue ?? 250;
  const dueDate = input.dueDate ?? new Date('2030-01-15T00:00:00.000Z');

  const obligation = await prisma.financialObligation.create({
    data: {
      userId: input.userId,
      categoryId: input.categoryId,
      name: input.obligationName ?? 'E2E Monthly Payment',
      type: 'CUSTOM',
      status: 'ACTIVE',
      amount: amountDue,
      currency: 'ZAR',
      priority: 'MEDIUM',
      startDate: dueDate,
    },
  });

  const schedule = await prisma.paymentSchedule.create({
    data: {
      obligationId: obligation.id,
      frequency: 'ONCE',
      startDate: dueDate,
    },
  });

  const occurrence = await prisma.paymentOccurrence.create({
    data: {
      userId: input.userId,
      obligationId: obligation.id,
      scheduleId: schedule.id,
      dueDate,
      amountDue,
      currency: 'ZAR',
      status: input.status ?? 'PENDING',
      sequenceNumber: 1,
      ...(input.overdueAt ? { overdueAt: input.overdueAt } : {}),
      ...(input.missedAt ? { missedAt: input.missedAt } : {}),
    },
  });

  return { obligation, schedule, occurrence };
}
