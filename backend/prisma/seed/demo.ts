import {
  Currency,
  MascotMood,
  NotificationType,
  ObligationPriority,
  ObligationStatus,
  ObligationType,
  PaymentOccurrenceStatus,
  PaymentRecordStatus,
  PrismaClient,
  ReminderChannel,
  ReminderStatus,
  RewardTransactionType,
  ScheduleFrequency,
  ScoreEventType,
  ScoreTier,
  Theme,
  UserEventSourceType,
  UserEventType,
} from '@prisma/client';
import { seedBadges } from './badges';
import { seedCategories } from './categories';

const prisma = new PrismaClient();

async function clearDemoUser(userId: string) {
  await prisma.$transaction([
    prisma.userBadge.deleteMany({ where: { userId } }),
    prisma.rewardTransaction.deleteMany({ where: { userId } }),
    prisma.userEvent.deleteMany({ where: { userId } }),
    prisma.scoreEvent.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({ where: { userId } }),
    prisma.reminder.deleteMany({ where: { userId } }),
    prisma.paymentRecord.deleteMany({ where: { userId } }),
    prisma.paymentOccurrence.deleteMany({ where: { userId } }),
    prisma.paymentSchedule.deleteMany({
      where: { obligation: { userId } },
    }),
    prisma.financialObligation.deleteMany({ where: { userId } }),
    prisma.creditProfile.deleteMany({ where: { userId } }),
    prisma.gamificationProfile.deleteMany({ where: { userId } }),
    prisma.notificationPreference.deleteMany({ where: { userId } }),
    prisma.userPreference.deleteMany({ where: { userId } }),
  ]);
}

async function main() {
  await seedCategories(prisma);
  await seedBadges(prisma);

  const user = await prisma.user.upsert({
    where: { email: 'demo@spendsense.local' },
    update: {
      supabaseAuthId: 'demo-supabase-user-id',
      displayName: 'Demo Student',
      onboardingCompleted: true,
      deletedAt: null,
    },
    create: {
      email: 'demo@spendsense.local',
      supabaseAuthId: 'demo-supabase-user-id',
      displayName: 'Demo Student',
      onboardingCompleted: true,
    },
  });

  await clearDemoUser(user.id);

  const [rentCategory, subscriptionCategory, bnplCategory] =
    await Promise.all([
      prisma.category.findFirstOrThrow({ where: { name: 'Rent' } }),
      prisma.category.findFirstOrThrow({ where: { name: 'Subscription' } }),
      prisma.category.findFirstOrThrow({ where: { name: 'BNPL' } }),
    ]);

  const [preference, notificationPreference, creditProfile] =
    await prisma.$transaction([
      prisma.userPreference.create({
        data: {
          userId: user.id,
          theme: Theme.SYSTEM,
          currency: Currency.ZAR,
        },
      }),
      prisma.notificationPreference.create({
        data: { userId: user.id, defaultReminderDaysBefore: 3 },
      }),
      prisma.creditProfile.create({
        data: {
          userId: user.id,
          previousScore: 600,
          currentScore: 603,
          scoreTier: ScoreTier.GOOD,
          onTimePaymentCount: 1,
          latePaymentCount: 1,
          missedPaymentCount: 0,
          lastCalculatedAt: new Date('2026-05-18T08:30:00.000Z'),
        },
      }),
    ]);

  void preference;
  void notificationPreference;

  const gamificationProfile = await prisma.gamificationProfile.create({
    data: {
      userId: user.id,
      coinBalance: 75,
      xp: 120,
      mascotLevel: 2,
      mascotMood: MascotMood.HAPPY,
      currentPaymentStreak: 1,
      longestPaymentStreak: 1,
    },
  });

  void gamificationProfile;

  const [rent, netflix, laptop] = await prisma.$transaction([
    prisma.financialObligation.create({
      data: {
        userId: user.id,
        categoryId: rentCategory.id,
        name: 'Hatfield Rent',
        type: ObligationType.RENT,
        status: ObligationStatus.ACTIVE,
        amount: 5200,
        currency: Currency.ZAR,
        priority: ObligationPriority.CRITICAL,
        startDate: new Date('2026-04-01T00:00:00.000Z'),
      },
    }),
    prisma.financialObligation.create({
      data: {
        userId: user.id,
        categoryId: subscriptionCategory.id,
        name: 'Netflix',
        type: ObligationType.SUBSCRIPTION,
        status: ObligationStatus.ACTIVE,
        amount: 199,
        currency: Currency.ZAR,
        priority: ObligationPriority.MEDIUM,
        startDate: new Date('2026-04-15T00:00:00.000Z'),
      },
    }),
    prisma.financialObligation.create({
      data: {
        userId: user.id,
        categoryId: bnplCategory.id,
        name: 'Laptop Instalment',
        type: ObligationType.BNPL,
        status: ObligationStatus.ACTIVE,
        amount: 850,
        currency: Currency.ZAR,
        priority: ObligationPriority.HIGH,
        startDate: new Date('2026-05-05T00:00:00.000Z'),
      },
    }),
  ]);

  const [rentSchedule, netflixSchedule, laptopSchedule] =
    await prisma.$transaction([
      prisma.paymentSchedule.create({
        data: {
          obligationId: rent.id,
          frequency: ScheduleFrequency.MONTHLY,
          dayOfMonth: 1,
          startDate: rent.startDate,
        },
      }),
      prisma.paymentSchedule.create({
        data: {
          obligationId: netflix.id,
          frequency: ScheduleFrequency.MONTHLY,
          dayOfMonth: 15,
          startDate: netflix.startDate,
        },
      }),
      prisma.paymentSchedule.create({
        data: {
          obligationId: laptop.id,
          frequency: ScheduleFrequency.FIXED_INSTALLMENT,
          dayOfMonth: 5,
          totalOccurrences: 6,
          startDate: laptop.startDate,
        },
      }),
    ]);

  const [rentPaid, rentUpcoming, netflixLate, netflixOverdue, laptopPending] =
    await prisma.$transaction([
      prisma.paymentOccurrence.create({
        data: {
          userId: user.id,
          obligationId: rent.id,
          scheduleId: rentSchedule.id,
          dueDate: new Date('2026-05-01T00:00:00.000Z'),
          amountDue: 5200,
          currency: Currency.ZAR,
          status: PaymentOccurrenceStatus.PAID,
          sequenceNumber: 2,
          paidAt: new Date('2026-04-30T10:00:00.000Z'),
        },
      }),
      prisma.paymentOccurrence.create({
        data: {
          userId: user.id,
          obligationId: rent.id,
          scheduleId: rentSchedule.id,
          dueDate: new Date('2026-06-01T00:00:00.000Z'),
          amountDue: 5200,
          currency: Currency.ZAR,
          status: PaymentOccurrenceStatus.PENDING,
          sequenceNumber: 3,
        },
      }),
      prisma.paymentOccurrence.create({
        data: {
          userId: user.id,
          obligationId: netflix.id,
          scheduleId: netflixSchedule.id,
          dueDate: new Date('2026-04-15T00:00:00.000Z'),
          amountDue: 199,
          currency: Currency.ZAR,
          status: PaymentOccurrenceStatus.PAID_LATE,
          sequenceNumber: 1,
          paidAt: new Date('2026-04-18T12:00:00.000Z'),
        },
      }),
      prisma.paymentOccurrence.create({
        data: {
          userId: user.id,
          obligationId: netflix.id,
          scheduleId: netflixSchedule.id,
          dueDate: new Date('2026-05-15T00:00:00.000Z'),
          amountDue: 199,
          currency: Currency.ZAR,
          status: PaymentOccurrenceStatus.OVERDUE,
          sequenceNumber: 2,
          overdueAt: new Date('2026-05-16T00:00:00.000Z'),
        },
      }),
      prisma.paymentOccurrence.create({
        data: {
          userId: user.id,
          obligationId: laptop.id,
          scheduleId: laptopSchedule.id,
          dueDate: new Date('2026-06-05T00:00:00.000Z'),
          amountDue: 850,
          currency: Currency.ZAR,
          status: PaymentOccurrenceStatus.PENDING,
          sequenceNumber: 2,
        },
      }),
    ]);

  const [rentPayment, netflixPayment] = await prisma.$transaction([
    prisma.paymentRecord.create({
      data: {
        userId: user.id,
        obligationId: rent.id,
        occurrenceId: rentPaid.id,
        amountPaid: 5200,
        currency: Currency.ZAR,
        paidDate: new Date('2026-04-30T10:00:00.000Z'),
        paymentStatus: PaymentRecordStatus.ON_TIME,
      },
    }),
    prisma.paymentRecord.create({
      data: {
        userId: user.id,
        obligationId: netflix.id,
        occurrenceId: netflixLate.id,
        amountPaid: 199,
        currency: Currency.ZAR,
        paidDate: new Date('2026-04-18T12:00:00.000Z'),
        paymentStatus: PaymentRecordStatus.LATE,
        daysLate: 3,
        simulatedInterest: 5,
      },
    }),
  ]);

  const [createdEvent, onTimeEvent, lateEvent] = await prisma.$transaction([
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.OBLIGATION_CREATED,
        sourceType: UserEventSourceType.FINANCIAL_OBLIGATION,
        sourceId: rent.id,
      },
    }),
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.PAYMENT_ON_TIME,
        sourceType: UserEventSourceType.PAYMENT_RECORD,
        sourceId: rentPayment.id,
      },
    }),
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.PAYMENT_LATE,
        sourceType: UserEventSourceType.PAYMENT_RECORD,
        sourceId: netflixPayment.id,
      },
    }),
  ]);

  await prisma.$transaction([
    prisma.scoreEvent.create({
      data: {
        userId: user.id,
        creditProfileId: creditProfile.id,
        occurrenceId: rentPaid.id,
        paymentRecordId: rentPayment.id,
        eventType: ScoreEventType.PAYMENT_ON_TIME,
        pointsDelta: 8,
        scoreBefore: 600,
        scoreAfter: 608,
        explanation: 'Hatfield Rent paid on time.',
      },
    }),
    prisma.scoreEvent.create({
      data: {
        userId: user.id,
        creditProfileId: creditProfile.id,
        occurrenceId: netflixLate.id,
        paymentRecordId: netflixPayment.id,
        eventType: ScoreEventType.PAYMENT_LATE,
        pointsDelta: -10,
        scoreBefore: 608,
        scoreAfter: 598,
        explanation: 'Netflix subscription paid 3 days late.',
      },
    }),
    prisma.scoreEvent.create({
      data: {
        userId: user.id,
        creditProfileId: creditProfile.id,
        eventType: ScoreEventType.MANUAL_ADJUSTMENT,
        pointsDelta: 5,
        scoreBefore: 598,
        scoreAfter: 603,
        explanation: 'First obligation tracked.',
      },
    }),
  ]);

  await prisma.$transaction([
    prisma.rewardTransaction.create({
      data: {
        userId: user.id,
        sourceEventId: onTimeEvent.id,
        type: RewardTransactionType.EARNED,
        amount: 20,
        balanceAfter: 20,
        reason: 'On-time rent payment',
      },
    }),
    prisma.rewardTransaction.create({
      data: {
        userId: user.id,
        sourceEventId: createdEvent.id,
        type: RewardTransactionType.EARNED,
        amount: 25,
        balanceAfter: 45,
        reason: 'First obligation created',
      },
    }),
    prisma.rewardTransaction.create({
      data: {
        userId: user.id,
        sourceEventId: lateEvent.id,
        type: RewardTransactionType.EARNED,
        amount: 30,
        balanceAfter: 75,
        reason: 'First badge earned',
      },
    }),
  ]);

  const badges = await prisma.badgeDefinition.findMany({
    where: {
      code: {
        in: [
          'FIRST_OBLIGATION_CREATED',
          'FIRST_ON_TIME_PAYMENT',
          'DEMO_READY',
        ],
      },
    },
  });

  await prisma.userBadge.createMany({
    data: badges.map((badge) => ({
      userId: user.id,
      badgeDefinitionId: badge.id,
      progress: badge.criteriaValue,
      earnedAt: new Date('2026-05-18T08:30:00.000Z'),
    })),
  });

  await prisma.$transaction([
    prisma.reminder.create({
      data: {
        userId: user.id,
        occurrenceId: rentUpcoming.id,
        channel: ReminderChannel.IN_APP,
        scheduledFor: new Date('2026-05-29T08:00:00.000Z'),
        priority: ObligationPriority.CRITICAL,
        message: 'Hatfield Rent is due soon.',
      },
    }),
    prisma.reminder.create({
      data: {
        userId: user.id,
        occurrenceId: laptopPending.id,
        channel: ReminderChannel.IN_APP,
        scheduledFor: new Date('2026-06-02T08:00:00.000Z'),
        priority: ObligationPriority.HIGH,
        message: 'Laptop Instalment is due soon.',
      },
    }),
    prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.PAYMENT_STATUS,
        title: 'Payment overdue',
        message: 'Netflix is overdue.',
        sourceType: UserEventSourceType.PAYMENT_OCCURRENCE,
        sourceId: netflixOverdue.id,
      },
    }),
    prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.BADGE_EARNED,
        title: 'Badge earned',
        message: 'You earned On-Time Starter.',
        sourceType: UserEventSourceType.BADGE,
      },
    }),
  ]);
}

main()
  .then(() => {
    console.log('Demo seed completed.');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
