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
import { seedQuizzes } from './quizzes';

const prisma = new PrismaClient();

const DEMO_EMAIL =
  process.env.DEMO_USER_EMAIL ??
  process.env.SUPABASE_TEST_EMAIL ??
  'demo@spendsense.local';
const configuredDemoAuthId =
  process.env.DEMO_SUPABASE_AUTH_ID ?? process.env.SUPABASE_TEST_USER_ID;
const DEMO_SUPABASE_AUTH_ID =
  configuredDemoAuthId ?? 'demo-supabase-user-id';
const DEMO_DISPLAY_NAME = process.env.DEMO_DISPLAY_NAME ?? 'Demo Student';

function d(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function dt(dateTime: string) {
  return new Date(dateTime);
}

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

async function resolveDemoUser() {
  const matchingUsers = await prisma.user.findMany({
    where: {
      OR: [{ email: DEMO_EMAIL }, { supabaseAuthId: DEMO_SUPABASE_AUTH_ID }],
    },
  });

  if (matchingUsers.length > 1) {
    throw new Error(
      `Demo seed found more than one matching user for email ${DEMO_EMAIL} and Supabase auth id ${DEMO_SUPABASE_AUTH_ID}. Use one dedicated demo auth account or clean up the duplicate internal user rows before reseeding.`,
    );
  }

  const data = {
    email: DEMO_EMAIL,
    supabaseAuthId: DEMO_SUPABASE_AUTH_ID,
    displayName: DEMO_DISPLAY_NAME,
    avatarUrl:
      'https://api.dicebear.com/9.x/personas/svg?seed=SpendSenseDemo',
    onboardingCompleted: true,
    deletedAt: null,
  };

  if (matchingUsers[0]) {
    return prisma.user.update({
      where: { id: matchingUsers[0].id },
      data,
    });
  }

  return prisma.user.create({ data });
}

async function main() {
  if (
    !configuredDemoAuthId ||
    DEMO_SUPABASE_AUTH_ID === 'demo-supabase-user-id' ||
    DEMO_SUPABASE_AUTH_ID.startsWith('replace_me')
  ) {
    throw new Error(
      'Set DEMO_SUPABASE_AUTH_ID to the real Supabase Auth user id before running the demo seed.',
    );
  }

  await seedCategories(prisma);
  await seedBadges(prisma);
  await seedQuizzes(prisma);

  const user = await resolveDemoUser();
  await clearDemoUser(user.id);

  const categories = await Promise.all([
    prisma.category.findFirstOrThrow({ where: { name: 'Rent' } }),
    prisma.category.findFirstOrThrow({ where: { name: 'Subscription' } }),
    prisma.category.findFirstOrThrow({ where: { name: 'BNPL' } }),
    prisma.category.findFirstOrThrow({ where: { name: 'Utility' } }),
    prisma.category.findFirstOrThrow({ where: { name: 'IOU' } }),
  ]);
  const [
    rentCategory,
    subscriptionCategory,
    bnplCategory,
    utilityCategory,
    iouCategory,
  ] = categories;

  const [preference, notificationPreference, creditProfile] =
    await prisma.$transaction([
      prisma.userPreference.create({
        data: {
          userId: user.id,
          theme: Theme.LIGHT,
          currency: Currency.ZAR,
          language: 'en',
          reducedMotion: false,
        },
      }),
      prisma.notificationPreference.create({
        data: {
          userId: user.id,
          inAppEnabled: true,
          emailEnabled: false,
          pushEnabled: true,
          smsEnabled: false,
          defaultReminderDaysBefore: 3,
        },
      }),
      prisma.creditProfile.create({
        data: {
          userId: user.id,
          previousScore: 624,
          currentScore: 656,
          scoreTier: ScoreTier.GOOD,
          onTimePaymentCount: 5,
          latePaymentCount: 2,
          missedPaymentCount: 0,
          currentUtilisationScore: 0.42,
          lastCalculatedAt: dt('2026-05-19T08:30:00.000Z'),
        },
      }),
    ]);

  void preference;
  void notificationPreference;

  await prisma.gamificationProfile.create({
    data: {
      userId: user.id,
      coinBalance: 145,
      xp: 320,
      mascotLevel: 2,
      mascotMood: MascotMood.HAPPY,
      currentPaymentStreak: 4,
      longestPaymentStreak: 5,
      currentKnowledgeStreak: 0,
      longestKnowledgeStreak: 2,
    },
  });

  const [rent, netflix, laptop, electricity, textbookIou, gym] =
    await prisma.$transaction([
      prisma.financialObligation.create({
        data: {
          userId: user.id,
          categoryId: rentCategory.id,
          name: 'Hatfield Rent',
          description: 'Student accommodation near campus',
          type: ObligationType.RENT,
          status: ObligationStatus.ACTIVE,
          amount: 5200,
          currency: Currency.ZAR,
          priority: ObligationPriority.CRITICAL,
          startDate: d('2026-04-01'),
        },
      }),
      prisma.financialObligation.create({
        data: {
          userId: user.id,
          categoryId: subscriptionCategory.id,
          name: 'Netflix',
          description: 'Monthly streaming subscription',
          type: ObligationType.SUBSCRIPTION,
          status: ObligationStatus.ACTIVE,
          amount: 199,
          currency: Currency.ZAR,
          priority: ObligationPriority.MEDIUM,
          startDate: d('2026-04-25'),
        },
      }),
      prisma.financialObligation.create({
        data: {
          userId: user.id,
          categoryId: bnplCategory.id,
          name: 'Laptop Instalment',
          description: 'Six-month BNPL repayment for study laptop',
          type: ObligationType.BNPL,
          status: ObligationStatus.ACTIVE,
          amount: 850,
          currency: Currency.ZAR,
          priority: ObligationPriority.HIGH,
          startDate: d('2026-04-05'),
        },
      }),
      prisma.financialObligation.create({
        data: {
          userId: user.id,
          categoryId: utilityCategory.id,
          name: 'Electricity Prepaid Top-up',
          description: 'Monthly utilities contribution',
          type: ObligationType.UTILITY,
          status: ObligationStatus.ACTIVE,
          amount: 620,
          currency: Currency.ZAR,
          priority: ObligationPriority.HIGH,
          startDate: d('2026-04-20'),
        },
      }),
      prisma.financialObligation.create({
        data: {
          userId: user.id,
          categoryId: iouCategory.id,
          name: 'Textbook IOU',
          description: 'Pay back group textbook contribution',
          type: ObligationType.IOU,
          status: ObligationStatus.ACTIVE,
          amount: 450,
          currency: Currency.ZAR,
          priority: ObligationPriority.LOW,
          startDate: d('2026-05-23'),
          endDate: d('2026-05-23'),
        },
      }),
      prisma.financialObligation.create({
        data: {
          userId: user.id,
          categoryId: subscriptionCategory.id,
          name: 'Campus Gym',
          description: 'Monthly gym membership',
          type: ObligationType.SUBSCRIPTION,
          status: ObligationStatus.ACTIVE,
          amount: 299,
          currency: Currency.ZAR,
          priority: ObligationPriority.MEDIUM,
          startDate: d('2026-04-28'),
        },
      }),
    ]);

  const [
    rentSchedule,
    netflixSchedule,
    laptopSchedule,
    electricitySchedule,
    textbookSchedule,
    gymSchedule,
  ] = await prisma.$transaction([
    prisma.paymentSchedule.create({
      data: {
        obligationId: rent.id,
        frequency: ScheduleFrequency.MONTHLY,
        interval: 1,
        dayOfMonth: 1,
        startDate: rent.startDate,
        occurrencesGeneratedUntil: d('2026-06-01'),
      },
    }),
    prisma.paymentSchedule.create({
      data: {
        obligationId: netflix.id,
        frequency: ScheduleFrequency.MONTHLY,
        interval: 1,
        dayOfMonth: 25,
        startDate: netflix.startDate,
        occurrencesGeneratedUntil: d('2026-06-25'),
      },
    }),
    prisma.paymentSchedule.create({
      data: {
        obligationId: laptop.id,
        frequency: ScheduleFrequency.FIXED_INSTALLMENT,
        interval: 1,
        dayOfMonth: 5,
        startDate: laptop.startDate,
        totalOccurrences: 6,
        occurrencesGeneratedUntil: d('2026-07-05'),
      },
    }),
    prisma.paymentSchedule.create({
      data: {
        obligationId: electricity.id,
        frequency: ScheduleFrequency.MONTHLY,
        interval: 1,
        dayOfMonth: 20,
        startDate: electricity.startDate,
        occurrencesGeneratedUntil: d('2026-06-20'),
      },
    }),
    prisma.paymentSchedule.create({
      data: {
        obligationId: textbookIou.id,
        frequency: ScheduleFrequency.ONCE,
        startDate: textbookIou.startDate,
        endDate: textbookIou.endDate,
        totalOccurrences: 1,
        occurrencesGeneratedUntil: d('2026-05-23'),
      },
    }),
    prisma.paymentSchedule.create({
      data: {
        obligationId: gym.id,
        frequency: ScheduleFrequency.MONTHLY,
        interval: 1,
        dayOfMonth: 28,
        startDate: gym.startDate,
        occurrencesGeneratedUntil: d('2026-05-28'),
      },
    }),
  ]);

  const [
    rentApr,
    rentMay,
    rentJun,
    netflixApr,
    netflixMay,
    netflixJun,
    laptopApr,
    laptopMay,
    laptopJun,
    laptopJul,
    electricityApr,
    electricityMay,
    electricityJun,
    textbookMay,
    gymApr,
    gymMay,
  ] = await prisma.$transaction([
    prisma.paymentOccurrence.create({
      data: {
        userId: user.id,
        obligationId: rent.id,
        scheduleId: rentSchedule.id,
        dueDate: d('2026-04-01'),
        amountDue: 5200,
        currency: Currency.ZAR,
        status: PaymentOccurrenceStatus.PAID,
        sequenceNumber: 1,
        paidAt: dt('2026-03-31T10:00:00.000Z'),
      },
    }),
    prisma.paymentOccurrence.create({
      data: {
        userId: user.id,
        obligationId: rent.id,
        scheduleId: rentSchedule.id,
        dueDate: d('2026-05-01'),
        amountDue: 5200,
        currency: Currency.ZAR,
        status: PaymentOccurrenceStatus.PAID,
        sequenceNumber: 2,
        paidAt: dt('2026-05-01T08:15:00.000Z'),
      },
    }),
    prisma.paymentOccurrence.create({
      data: {
        userId: user.id,
        obligationId: rent.id,
        scheduleId: rentSchedule.id,
        dueDate: d('2026-06-01'),
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
        dueDate: d('2026-04-25'),
        amountDue: 199,
        currency: Currency.ZAR,
        status: PaymentOccurrenceStatus.PAID,
        sequenceNumber: 1,
        paidAt: dt('2026-04-24T18:00:00.000Z'),
      },
    }),
    prisma.paymentOccurrence.create({
      data: {
        userId: user.id,
        obligationId: netflix.id,
        scheduleId: netflixSchedule.id,
        dueDate: d('2026-05-25'),
        amountDue: 199,
        currency: Currency.ZAR,
        status: PaymentOccurrenceStatus.PENDING,
        sequenceNumber: 2,
      },
    }),
    prisma.paymentOccurrence.create({
      data: {
        userId: user.id,
        obligationId: netflix.id,
        scheduleId: netflixSchedule.id,
        dueDate: d('2026-06-25'),
        amountDue: 199,
        currency: Currency.ZAR,
        status: PaymentOccurrenceStatus.PENDING,
        sequenceNumber: 3,
      },
    }),
    prisma.paymentOccurrence.create({
      data: {
        userId: user.id,
        obligationId: laptop.id,
        scheduleId: laptopSchedule.id,
        dueDate: d('2026-04-05'),
        amountDue: 850,
        currency: Currency.ZAR,
        status: PaymentOccurrenceStatus.PAID_LATE,
        sequenceNumber: 1,
        paidAt: dt('2026-04-08T12:30:00.000Z'),
      },
    }),
    prisma.paymentOccurrence.create({
      data: {
        userId: user.id,
        obligationId: laptop.id,
        scheduleId: laptopSchedule.id,
        dueDate: d('2026-05-05'),
        amountDue: 850,
        currency: Currency.ZAR,
        status: PaymentOccurrenceStatus.PAID,
        sequenceNumber: 2,
        paidAt: dt('2026-05-04T15:00:00.000Z'),
      },
    }),
    prisma.paymentOccurrence.create({
      data: {
        userId: user.id,
        obligationId: laptop.id,
        scheduleId: laptopSchedule.id,
        dueDate: d('2026-06-05'),
        amountDue: 850,
        currency: Currency.ZAR,
        status: PaymentOccurrenceStatus.PENDING,
        sequenceNumber: 3,
      },
    }),
    prisma.paymentOccurrence.create({
      data: {
        userId: user.id,
        obligationId: laptop.id,
        scheduleId: laptopSchedule.id,
        dueDate: d('2026-07-05'),
        amountDue: 850,
        currency: Currency.ZAR,
        status: PaymentOccurrenceStatus.PENDING,
        sequenceNumber: 4,
      },
    }),
    prisma.paymentOccurrence.create({
      data: {
        userId: user.id,
        obligationId: electricity.id,
        scheduleId: electricitySchedule.id,
        dueDate: d('2026-04-20'),
        amountDue: 620,
        currency: Currency.ZAR,
        status: PaymentOccurrenceStatus.PAID_LATE,
        sequenceNumber: 1,
        paidAt: dt('2026-04-22T09:00:00.000Z'),
      },
    }),
    prisma.paymentOccurrence.create({
      data: {
        userId: user.id,
        obligationId: electricity.id,
        scheduleId: electricitySchedule.id,
        dueDate: d('2026-05-20'),
        amountDue: 620,
        currency: Currency.ZAR,
        status: PaymentOccurrenceStatus.OVERDUE,
        sequenceNumber: 2,
        overdueAt: dt('2026-05-21T00:00:00.000Z'),
      },
    }),
    prisma.paymentOccurrence.create({
      data: {
        userId: user.id,
        obligationId: electricity.id,
        scheduleId: electricitySchedule.id,
        dueDate: d('2026-06-20'),
        amountDue: 620,
        currency: Currency.ZAR,
        status: PaymentOccurrenceStatus.PENDING,
        sequenceNumber: 3,
      },
    }),
    prisma.paymentOccurrence.create({
      data: {
        userId: user.id,
        obligationId: textbookIou.id,
        scheduleId: textbookSchedule.id,
        dueDate: d('2026-05-23'),
        amountDue: 450,
        currency: Currency.ZAR,
        status: PaymentOccurrenceStatus.PENDING,
        sequenceNumber: 1,
      },
    }),
    prisma.paymentOccurrence.create({
      data: {
        userId: user.id,
        obligationId: gym.id,
        scheduleId: gymSchedule.id,
        dueDate: d('2026-04-28'),
        amountDue: 299,
        currency: Currency.ZAR,
        status: PaymentOccurrenceStatus.PAID,
        sequenceNumber: 1,
        paidAt: dt('2026-04-28T07:45:00.000Z'),
      },
    }),
    prisma.paymentOccurrence.create({
      data: {
        userId: user.id,
        obligationId: gym.id,
        scheduleId: gymSchedule.id,
        dueDate: d('2026-05-28'),
        amountDue: 299,
        currency: Currency.ZAR,
        status: PaymentOccurrenceStatus.PENDING,
        sequenceNumber: 2,
      },
    }),
  ]);

  const [
    rentAprPayment,
    rentMayPayment,
    netflixAprPayment,
    laptopAprPayment,
    laptopMayPayment,
    electricityAprPayment,
    gymAprPayment,
  ] = await prisma.$transaction([
    prisma.paymentRecord.create({
      data: {
        userId: user.id,
        obligationId: rent.id,
        occurrenceId: rentApr.id,
        amountPaid: 5200,
        currency: Currency.ZAR,
        paidDate: dt('2026-03-31T10:00:00.000Z'),
        paymentStatus: PaymentRecordStatus.ON_TIME,
        notes: 'Paid one day early from allowance.',
      },
    }),
    prisma.paymentRecord.create({
      data: {
        userId: user.id,
        obligationId: rent.id,
        occurrenceId: rentMay.id,
        amountPaid: 5200,
        currency: Currency.ZAR,
        paidDate: dt('2026-05-01T08:15:00.000Z'),
        paymentStatus: PaymentRecordStatus.ON_TIME,
        notes: 'May rent paid on due date.',
      },
    }),
    prisma.paymentRecord.create({
      data: {
        userId: user.id,
        obligationId: netflix.id,
        occurrenceId: netflixApr.id,
        amountPaid: 199,
        currency: Currency.ZAR,
        paidDate: dt('2026-04-24T18:00:00.000Z'),
        paymentStatus: PaymentRecordStatus.ON_TIME,
      },
    }),
    prisma.paymentRecord.create({
      data: {
        userId: user.id,
        obligationId: laptop.id,
        occurrenceId: laptopApr.id,
        amountPaid: 850,
        currency: Currency.ZAR,
        paidDate: dt('2026-04-08T12:30:00.000Z'),
        paymentStatus: PaymentRecordStatus.LATE,
        daysLate: 3,
        simulatedInterest: 6,
        notes: 'Paid late after stipend delay.',
      },
    }),
    prisma.paymentRecord.create({
      data: {
        userId: user.id,
        obligationId: laptop.id,
        occurrenceId: laptopMay.id,
        amountPaid: 850,
        currency: Currency.ZAR,
        paidDate: dt('2026-05-04T15:00:00.000Z'),
        paymentStatus: PaymentRecordStatus.ON_TIME,
      },
    }),
    prisma.paymentRecord.create({
      data: {
        userId: user.id,
        obligationId: electricity.id,
        occurrenceId: electricityApr.id,
        amountPaid: 620,
        currency: Currency.ZAR,
        paidDate: dt('2026-04-22T09:00:00.000Z'),
        paymentStatus: PaymentRecordStatus.LATE,
        daysLate: 2,
        simulatedInterest: 4,
      },
    }),
    prisma.paymentRecord.create({
      data: {
        userId: user.id,
        obligationId: gym.id,
        occurrenceId: gymApr.id,
        amountPaid: 299,
        currency: Currency.ZAR,
        paidDate: dt('2026-04-28T07:45:00.000Z'),
        paymentStatus: PaymentRecordStatus.ON_TIME,
      },
    }),
  ]);

  const [
    userCreatedEvent,
    rentCreatedEvent,
    netflixCreatedEvent,
    laptopCreatedEvent,
    electricityCreatedEvent,
    iouCreatedEvent,
    gymCreatedEvent,
    rentAprEvent,
    laptopLateEvent,
    electricityLateEvent,
    netflixOnTimeEvent,
    gymOnTimeEvent,
    rentMayEvent,
    laptopMayEvent,
    scoreUpdatedEvent,
    badgeEarnedEvent,
  ] = await prisma.$transaction([
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.USER_CREATED,
        sourceType: UserEventSourceType.USER,
        sourceId: user.id,
        createdAt: dt('2026-03-25T09:00:00.000Z'),
        metadata: { supabaseAuthId: DEMO_SUPABASE_AUTH_ID },
      },
    }),
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.OBLIGATION_CREATED,
        sourceType: UserEventSourceType.FINANCIAL_OBLIGATION,
        sourceId: rent.id,
        createdAt: dt('2026-03-25T09:05:00.000Z'),
      },
    }),
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.OBLIGATION_CREATED,
        sourceType: UserEventSourceType.FINANCIAL_OBLIGATION,
        sourceId: netflix.id,
        createdAt: dt('2026-03-25T09:10:00.000Z'),
      },
    }),
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.OBLIGATION_CREATED,
        sourceType: UserEventSourceType.FINANCIAL_OBLIGATION,
        sourceId: laptop.id,
        createdAt: dt('2026-03-25T09:15:00.000Z'),
      },
    }),
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.OBLIGATION_CREATED,
        sourceType: UserEventSourceType.FINANCIAL_OBLIGATION,
        sourceId: electricity.id,
        createdAt: dt('2026-03-25T09:20:00.000Z'),
      },
    }),
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.OBLIGATION_CREATED,
        sourceType: UserEventSourceType.FINANCIAL_OBLIGATION,
        sourceId: textbookIou.id,
        createdAt: dt('2026-05-18T10:00:00.000Z'),
      },
    }),
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.OBLIGATION_CREATED,
        sourceType: UserEventSourceType.FINANCIAL_OBLIGATION,
        sourceId: gym.id,
        createdAt: dt('2026-04-01T09:00:00.000Z'),
      },
    }),
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.PAYMENT_ON_TIME,
        sourceType: UserEventSourceType.PAYMENT_RECORD,
        sourceId: rentAprPayment.id,
        createdAt: dt('2026-03-31T10:00:00.000Z'),
      },
    }),
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.PAYMENT_LATE,
        sourceType: UserEventSourceType.PAYMENT_RECORD,
        sourceId: laptopAprPayment.id,
        createdAt: dt('2026-04-08T12:30:00.000Z'),
      },
    }),
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.PAYMENT_LATE,
        sourceType: UserEventSourceType.PAYMENT_RECORD,
        sourceId: electricityAprPayment.id,
        createdAt: dt('2026-04-22T09:00:00.000Z'),
      },
    }),
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.PAYMENT_ON_TIME,
        sourceType: UserEventSourceType.PAYMENT_RECORD,
        sourceId: netflixAprPayment.id,
        createdAt: dt('2026-04-24T18:00:00.000Z'),
      },
    }),
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.PAYMENT_ON_TIME,
        sourceType: UserEventSourceType.PAYMENT_RECORD,
        sourceId: gymAprPayment.id,
        createdAt: dt('2026-04-28T07:45:00.000Z'),
      },
    }),
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.PAYMENT_ON_TIME,
        sourceType: UserEventSourceType.PAYMENT_RECORD,
        sourceId: rentMayPayment.id,
        createdAt: dt('2026-05-01T08:15:00.000Z'),
      },
    }),
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.PAYMENT_ON_TIME,
        sourceType: UserEventSourceType.PAYMENT_RECORD,
        sourceId: laptopMayPayment.id,
        createdAt: dt('2026-05-04T15:00:00.000Z'),
      },
    }),
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.SCORE_UPDATED,
        sourceType: UserEventSourceType.SCORE_EVENT,
        createdAt: dt('2026-05-19T08:30:00.000Z'),
      },
    }),
    prisma.userEvent.create({
      data: {
        userId: user.id,
        eventType: UserEventType.BADGE_EARNED,
        sourceType: UserEventSourceType.BADGE,
        createdAt: dt('2026-05-19T08:35:00.000Z'),
      },
    }),
  ]);

  void userCreatedEvent;
  void netflixCreatedEvent;
  void laptopCreatedEvent;
  void electricityCreatedEvent;
  void iouCreatedEvent;
  void gymCreatedEvent;

  const [
    rentAprScore,
    laptopLateScore,
    electricityLateScore,
    netflixScore,
    gymScore,
    rentMayScore,
    laptopMayScore,
    manualScore,
  ] = await prisma.$transaction([
    prisma.scoreEvent.create({
      data: {
        userId: user.id,
        creditProfileId: creditProfile.id,
        occurrenceId: rentApr.id,
        paymentRecordId: rentAprPayment.id,
        eventType: ScoreEventType.PAYMENT_ON_TIME,
        pointsDelta: 8,
        scoreBefore: 600,
        scoreAfter: 608,
        explanation: 'Hatfield Rent paid on time.',
        createdAt: dt('2026-03-31T10:00:00.000Z'),
      },
    }),
    prisma.scoreEvent.create({
      data: {
        userId: user.id,
        creditProfileId: creditProfile.id,
        occurrenceId: laptopApr.id,
        paymentRecordId: laptopAprPayment.id,
        eventType: ScoreEventType.PAYMENT_LATE,
        pointsDelta: -8,
        scoreBefore: 608,
        scoreAfter: 600,
        explanation: 'Laptop Instalment paid 3 days late.',
        calculationMetadata: { daysLate: 3, simulatedInterest: 6 },
        createdAt: dt('2026-04-08T12:30:00.000Z'),
      },
    }),
    prisma.scoreEvent.create({
      data: {
        userId: user.id,
        creditProfileId: creditProfile.id,
        occurrenceId: electricityApr.id,
        paymentRecordId: electricityAprPayment.id,
        eventType: ScoreEventType.PAYMENT_LATE,
        pointsDelta: -8,
        scoreBefore: 600,
        scoreAfter: 592,
        explanation: 'Electricity Prepaid Top-up paid 2 days late.',
        calculationMetadata: { daysLate: 2, simulatedInterest: 4 },
        createdAt: dt('2026-04-22T09:00:00.000Z'),
      },
    }),
    prisma.scoreEvent.create({
      data: {
        userId: user.id,
        creditProfileId: creditProfile.id,
        occurrenceId: netflixApr.id,
        paymentRecordId: netflixAprPayment.id,
        eventType: ScoreEventType.PAYMENT_ON_TIME,
        pointsDelta: 8,
        scoreBefore: 592,
        scoreAfter: 600,
        explanation: 'Netflix paid on time.',
        createdAt: dt('2026-04-24T18:00:00.000Z'),
      },
    }),
    prisma.scoreEvent.create({
      data: {
        userId: user.id,
        creditProfileId: creditProfile.id,
        occurrenceId: gymApr.id,
        paymentRecordId: gymAprPayment.id,
        eventType: ScoreEventType.PAYMENT_ON_TIME,
        pointsDelta: 8,
        scoreBefore: 600,
        scoreAfter: 608,
        explanation: 'Campus Gym paid on time.',
        createdAt: dt('2026-04-28T07:45:00.000Z'),
      },
    }),
    prisma.scoreEvent.create({
      data: {
        userId: user.id,
        creditProfileId: creditProfile.id,
        occurrenceId: rentMay.id,
        paymentRecordId: rentMayPayment.id,
        eventType: ScoreEventType.PAYMENT_ON_TIME,
        pointsDelta: 8,
        scoreBefore: 608,
        scoreAfter: 616,
        explanation: 'Hatfield Rent paid on time.',
        createdAt: dt('2026-05-01T08:15:00.000Z'),
      },
    }),
    prisma.scoreEvent.create({
      data: {
        userId: user.id,
        creditProfileId: creditProfile.id,
        occurrenceId: laptopMay.id,
        paymentRecordId: laptopMayPayment.id,
        eventType: ScoreEventType.PAYMENT_ON_TIME,
        pointsDelta: 8,
        scoreBefore: 616,
        scoreAfter: 624,
        explanation: 'Laptop Instalment paid on time.',
        createdAt: dt('2026-05-04T15:00:00.000Z'),
      },
    }),
    prisma.scoreEvent.create({
      data: {
        userId: user.id,
        creditProfileId: creditProfile.id,
        eventType: ScoreEventType.MANUAL_ADJUSTMENT,
        pointsDelta: 32,
        scoreBefore: 624,
        scoreAfter: 656,
        explanation: 'Consistent tracking and recent payment streak improved your simulated score.',
        calculationMetadata: { reason: 'demo_baseline_adjustment' },
        createdAt: dt('2026-05-19T08:30:00.000Z'),
      },
    }),
  ]);

  void rentAprScore;
  void laptopLateScore;
  void electricityLateScore;
  void netflixScore;
  void gymScore;
  void rentMayScore;
  void laptopMayScore;

  await prisma.userEvent.update({
    where: { id: scoreUpdatedEvent.id },
    data: { sourceId: manualScore.id },
  });

  await prisma.$transaction([
    prisma.rewardTransaction.create({
      data: {
        userId: user.id,
        sourceEventId: rentCreatedEvent.id,
        type: RewardTransactionType.EARNED,
        amount: 25,
        balanceAfter: 25,
        reason: 'First obligation created',
        createdAt: dt('2026-03-25T09:05:00.000Z'),
      },
    }),
    prisma.rewardTransaction.create({
      data: {
        userId: user.id,
        sourceEventId: rentAprEvent.id,
        type: RewardTransactionType.EARNED,
        amount: 15,
        balanceAfter: 40,
        reason: 'On-time rent payment',
        createdAt: dt('2026-03-31T10:00:00.000Z'),
      },
    }),
    prisma.rewardTransaction.create({
      data: {
        userId: user.id,
        sourceEventId: netflixOnTimeEvent.id,
        type: RewardTransactionType.EARNED,
        amount: 15,
        balanceAfter: 55,
        reason: 'On-time Netflix payment',
        createdAt: dt('2026-04-24T18:00:00.000Z'),
      },
    }),
    prisma.rewardTransaction.create({
      data: {
        userId: user.id,
        sourceEventId: gymOnTimeEvent.id,
        type: RewardTransactionType.EARNED,
        amount: 15,
        balanceAfter: 70,
        reason: 'On-time gym payment',
        createdAt: dt('2026-04-28T07:45:00.000Z'),
      },
    }),
    prisma.rewardTransaction.create({
      data: {
        userId: user.id,
        sourceEventId: rentMayEvent.id,
        type: RewardTransactionType.EARNED,
        amount: 15,
        balanceAfter: 85,
        reason: 'On-time May rent payment',
        createdAt: dt('2026-05-01T08:15:00.000Z'),
      },
    }),
    prisma.rewardTransaction.create({
      data: {
        userId: user.id,
        sourceEventId: laptopMayEvent.id,
        type: RewardTransactionType.EARNED,
        amount: 15,
        balanceAfter: 100,
        reason: 'On-time laptop instalment',
        createdAt: dt('2026-05-04T15:00:00.000Z'),
      },
    }),
    prisma.rewardTransaction.create({
      data: {
        userId: user.id,
        sourceEventId: badgeEarnedEvent.id,
        type: RewardTransactionType.EARNED,
        amount: 30,
        balanceAfter: 130,
        reason: 'Three payment streak badge',
        createdAt: dt('2026-05-04T15:05:00.000Z'),
      },
    }),
    prisma.rewardTransaction.create({
      data: {
        userId: user.id,
        sourceEventId: scoreUpdatedEvent.id,
        type: RewardTransactionType.EARNED,
        amount: 15,
        balanceAfter: 145,
        reason: 'Score milestone reward',
        createdAt: dt('2026-05-19T08:35:00.000Z'),
      },
    }),
  ]);

  const badges = await prisma.badgeDefinition.findMany({
    where: {
      code: {
        in: [
          'FIRST_OBLIGATION_CREATED',
          'FIRST_ON_TIME_PAYMENT',
          'THREE_PAYMENT_STREAK',
          'SCORE_650_REACHED',
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
      earnedAt:
        badge.code === 'SCORE_650_REACHED'
          ? dt('2026-05-19T08:35:00.000Z')
          : dt('2026-05-04T15:05:00.000Z'),
      metadata: { seededForDemo: true },
    })),
  });

  const scoreBadge = badges.find((badge) => badge.code === 'SCORE_650_REACHED');
  if (scoreBadge) {
    await prisma.userEvent.update({
      where: { id: badgeEarnedEvent.id },
      data: { sourceId: scoreBadge.id },
    });
  }

  await prisma.$transaction([
    prisma.reminder.create({
      data: {
        userId: user.id,
        occurrenceId: electricityMay.id,
        channel: ReminderChannel.IN_APP,
        scheduledFor: dt('2026-05-17T08:00:00.000Z'),
        sentAt: dt('2026-05-17T08:00:00.000Z'),
        status: ReminderStatus.SENT,
        priority: ObligationPriority.HIGH,
        message: 'Electricity Prepaid Top-up was due on 20 May.',
      },
    }),
    prisma.reminder.create({
      data: {
        userId: user.id,
        occurrenceId: textbookMay.id,
        channel: ReminderChannel.IN_APP,
        scheduledFor: dt('2026-05-22T08:00:00.000Z'),
        status: ReminderStatus.SCHEDULED,
        priority: ObligationPriority.LOW,
        message: 'Textbook IOU is due tomorrow.',
      },
    }),
    prisma.reminder.create({
      data: {
        userId: user.id,
        occurrenceId: netflixMay.id,
        channel: ReminderChannel.IN_APP,
        scheduledFor: dt('2026-05-22T08:00:00.000Z'),
        status: ReminderStatus.SCHEDULED,
        priority: ObligationPriority.MEDIUM,
        message: 'Netflix is due in 3 days.',
      },
    }),
    prisma.reminder.create({
      data: {
        userId: user.id,
        occurrenceId: gymMay.id,
        channel: ReminderChannel.IN_APP,
        scheduledFor: dt('2026-05-25T08:00:00.000Z'),
        status: ReminderStatus.SCHEDULED,
        priority: ObligationPriority.MEDIUM,
        message: 'Campus Gym is due in 3 days.',
      },
    }),
    prisma.reminder.create({
      data: {
        userId: user.id,
        occurrenceId: rentJun.id,
        channel: ReminderChannel.IN_APP,
        scheduledFor: dt('2026-05-29T08:00:00.000Z'),
        status: ReminderStatus.SCHEDULED,
        priority: ObligationPriority.CRITICAL,
        message: 'Hatfield Rent is due in 3 days.',
      },
    }),
    prisma.reminder.create({
      data: {
        userId: user.id,
        occurrenceId: laptopJun.id,
        channel: ReminderChannel.IN_APP,
        scheduledFor: dt('2026-06-02T08:00:00.000Z'),
        status: ReminderStatus.SCHEDULED,
        priority: ObligationPriority.HIGH,
        message: 'Laptop Instalment is due in 3 days.',
      },
    }),
    prisma.reminder.create({
      data: {
        userId: user.id,
        occurrenceId: electricityJun.id,
        channel: ReminderChannel.IN_APP,
        scheduledFor: dt('2026-06-17T08:00:00.000Z'),
        status: ReminderStatus.SCHEDULED,
        priority: ObligationPriority.HIGH,
        message: 'Electricity Prepaid Top-up is due in 3 days.',
      },
    }),
    prisma.reminder.create({
      data: {
        userId: user.id,
        occurrenceId: netflixJun.id,
        channel: ReminderChannel.IN_APP,
        scheduledFor: dt('2026-06-22T08:00:00.000Z'),
        status: ReminderStatus.SCHEDULED,
        priority: ObligationPriority.MEDIUM,
        message: 'Netflix is due in 3 days.',
      },
    }),
    prisma.reminder.create({
      data: {
        userId: user.id,
        occurrenceId: laptopJul.id,
        channel: ReminderChannel.IN_APP,
        scheduledFor: dt('2026-07-02T08:00:00.000Z'),
        status: ReminderStatus.SCHEDULED,
        priority: ObligationPriority.HIGH,
        message: 'Laptop Instalment is due in 3 days.',
      },
    }),
  ]);

  await prisma.$transaction([
    prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.PAYMENT_STATUS,
        title: 'Payment overdue',
        message: 'Electricity Prepaid Top-up was due on 20 May.',
        sourceType: UserEventSourceType.PAYMENT_OCCURRENCE,
        sourceId: electricityMay.id,
        createdAt: dt('2026-05-21T07:00:00.000Z'),
      },
    }),
    prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.REMINDER,
        title: 'Textbook IOU due soon',
        message: 'Your Textbook IOU payment of R450 is due on 23 May.',
        sourceType: UserEventSourceType.PAYMENT_OCCURRENCE,
        sourceId: textbookMay.id,
        createdAt: dt('2026-05-21T08:00:00.000Z'),
      },
    }),
    prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.REMINDER,
        title: 'Netflix due in 4 days',
        message: 'Your Netflix payment of R199 is due on 25 May.',
        sourceType: UserEventSourceType.PAYMENT_OCCURRENCE,
        sourceId: netflixMay.id,
        createdAt: dt('2026-05-21T08:05:00.000Z'),
      },
    }),
    prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.SCORE_CHANGE,
        title: 'Score improved',
        message: 'Your simulated financial health score increased to 656.',
        sourceType: UserEventSourceType.SCORE_EVENT,
        sourceId: manualScore.id,
        createdAt: dt('2026-05-19T08:35:00.000Z'),
      },
    }),
    prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.BADGE_EARNED,
        title: 'Badge earned',
        message: 'You earned Excellent Progress.',
        sourceType: UserEventSourceType.BADGE,
        sourceId: scoreBadge?.id,
        createdAt: dt('2026-05-19T08:36:00.000Z'),
      },
    }),
  ]);

  console.log('Demo seed completed.');
  console.log(`Demo email: ${DEMO_EMAIL}`);
  console.log(`Demo Supabase auth id: ${DEMO_SUPABASE_AUTH_ID}`);
  console.log(`Internal SpendSense user id: ${user.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
