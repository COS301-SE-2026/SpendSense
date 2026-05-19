import {
  Currency,
  ObligationPriority,
  ObligationType,
  PaymentOccurrenceStatus,
  PaymentRecordStatus,
  PrismaClient,
  RewardTransactionType,
  ScheduleFrequency,
  ScoreEventType,
  ScoreTier,
  UserEventSourceType,
  UserEventType,
} from '@prisma/client';

const prisma = new PrismaClient();
const smokeEmail = 'prisma-smoke@spendsense.local';

async function cleanup(userId?: string) {
  const user = userId
    ? { id: userId }
    : await prisma.user.findUnique({ where: { email: smokeEmail } });

  if (!user) {
    return;
  }

  await prisma.$transaction([
    prisma.userBadge.deleteMany({ where: { userId: user.id } }),
    prisma.rewardTransaction.deleteMany({ where: { userId: user.id } }),
    prisma.userEvent.deleteMany({ where: { userId: user.id } }),
    prisma.scoreEvent.deleteMany({ where: { userId: user.id } }),
    prisma.paymentRecord.deleteMany({ where: { userId: user.id } }),
    prisma.paymentOccurrence.deleteMany({ where: { userId: user.id } }),
    prisma.paymentSchedule.deleteMany({
      where: { obligation: { userId: user.id } },
    }),
    prisma.financialObligation.deleteMany({ where: { userId: user.id } }),
    prisma.creditProfile.deleteMany({ where: { userId: user.id } }),
    prisma.gamificationProfile.deleteMany({ where: { userId: user.id } }),
    prisma.notificationPreference.deleteMany({ where: { userId: user.id } }),
    prisma.userPreference.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);
}

async function main() {
  await cleanup();

  const category = await prisma.category.findFirstOrThrow({
    where: { name: 'Rent' },
  });
  const badge = await prisma.badgeDefinition.findFirstOrThrow({
    where: { code: 'FIRST_OBLIGATION_CREATED' },
  });

  const user = await prisma.user.create({
    data: {
      email: smokeEmail,
      supabaseAuthId: 'prisma-smoke-user-id',
      preference: { create: {} },
      notificationPreference: { create: {} },
      creditProfile: {
        create: {
          currentScore: 600,
          previousScore: 600,
          scoreTier: ScoreTier.GOOD,
        },
      },
      gamificationProfile: { create: {} },
    },
    include: { creditProfile: true },
  });

  try {
    const obligation = await prisma.financialObligation.create({
      data: {
        userId: user.id,
        categoryId: category.id,
        name: 'Smoke Test Rent',
        type: ObligationType.RENT,
        amount: 1000,
        currency: Currency.ZAR,
        priority: ObligationPriority.HIGH,
        startDate: new Date('2026-05-01T00:00:00.000Z'),
      },
    });

    const schedule = await prisma.paymentSchedule.create({
      data: {
        obligationId: obligation.id,
        frequency: ScheduleFrequency.MONTHLY,
        dayOfMonth: 1,
        startDate: obligation.startDate,
      },
    });

    const occurrence = await prisma.paymentOccurrence.create({
      data: {
        userId: user.id,
        obligationId: obligation.id,
        scheduleId: schedule.id,
        dueDate: new Date('2026-06-01T00:00:00.000Z'),
        amountDue: 1000,
        currency: Currency.ZAR,
        status: PaymentOccurrenceStatus.PAID,
        sequenceNumber: 1,
      },
    });

    const payment = await prisma.paymentRecord.create({
      data: {
        userId: user.id,
        occurrenceId: occurrence.id,
        obligationId: obligation.id,
        amountPaid: 1000,
        currency: Currency.ZAR,
        paidDate: new Date('2026-05-31T00:00:00.000Z'),
        paymentStatus: PaymentRecordStatus.ON_TIME,
      },
    });

    const scoreEvent = await prisma.scoreEvent.create({
      data: {
        userId: user.id,
        creditProfileId: user.creditProfile!.id,
        occurrenceId: occurrence.id,
        paymentRecordId: payment.id,
        eventType: ScoreEventType.PAYMENT_ON_TIME,
        pointsDelta: 8,
        scoreBefore: 600,
        scoreAfter: 608,
        explanation: 'Smoke test payment paid on time.',
      },
    });

    const userEvent = await prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.PAYMENT_ON_TIME,
        sourceType: UserEventSourceType.PAYMENT_RECORD,
        sourceId: payment.id,
      },
    });

    const reward = await prisma.rewardTransaction.create({
      data: {
        userId: user.id,
        sourceEventId: userEvent.id,
        type: RewardTransactionType.EARNED,
        amount: 10,
        balanceAfter: 10,
        reason: 'Smoke test reward',
      },
    });

    const userBadge = await prisma.userBadge.create({
      data: {
        userId: user.id,
        badgeDefinitionId: badge.id,
        progress: 1,
        earnedAt: new Date('2026-05-18T00:00:00.000Z'),
      },
    });

    if (
      payment.occurrenceId !== occurrence.id ||
      scoreEvent.paymentRecordId !== payment.id ||
      reward.sourceEventId !== userEvent.id ||
      userBadge.badgeDefinitionId !== badge.id
    ) {
      throw new Error('Prisma relation smoke check failed.');
    }

    console.log('Prisma smoke check passed.');
  } finally {
    await cleanup(user.id);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
