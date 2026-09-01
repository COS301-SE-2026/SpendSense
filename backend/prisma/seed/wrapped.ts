import {
  Currency,
  ObligationPriority,
  ObligationStatus,
  ObligationType,
  PaymentOccurrenceStatus,
  PaymentRecordStatus,
  PrismaClient,
  QuizSessionStatus,
  QuizSessionType,
  RewardTransactionType,
  ScheduleFrequency,
  ScoreEventType,
  ScoreTier,
  UserEventSourceType,
  UserEventType,
} from '@prisma/client';
import { seedBadges } from './badges';
import { seedCategories } from './categories';
import { seedQuizzes } from './quizzes';

const prisma = new PrismaClient();
const email = process.env.DEMO_USER_EMAIL ?? 'demo@spendsense.local';
const authId = process.env.DEMO_SUPABASE_AUTH_ID;

const obligations = [
  ['Rent', 'Rent', ObligationType.RENT, 5200],
  ['Laptop', 'BNPL', ObligationType.BNPL, 850],
  ['Electricity', 'Utility', ObligationType.UTILITY, 650],
  ['Netflix', 'Subscription', ObligationType.SUBSCRIPTION, 199],
  ['Textbook IOU', 'IOU', ObligationType.IOU, 450],
] as const;

const months = [
  {
    number: 8,
    outcomes: ['ON_TIME', 'ON_TIME', 'LATE', 'ON_TIME', 'MISSED'],
    score: [642, 681],
    badges: ['FIRST_ON_TIME_PAYMENT', 'THREE_PAYMENT_STREAK'],
    quizDays: [12, 17],
  },
  {
    number: 9,
    outcomes: ['ON_TIME', 'LATE', 'ON_TIME', 'ON_TIME', 'ON_TIME'],
    score: [681, 697],
    badges: ['FIRST_QUIZ_COMPLETION', 'THREE_DAY_KNOWLEDGE_STREAK'],
    quizDays: [9, 11],
  },
] as const;

function at(month: number, day: number, hour = 9) {
  return new Date(
    `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00.000Z`,
  );
}

function assertLocalDatabase() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL is required.');

  const url = new URL(rawUrl);
  const localHosts = ['localhost', '127.0.0.1', '::1', 'postgres'];
  if (!localHosts.includes(url.hostname) || url.pathname.includes('prod')) {
    throw new Error('This test seed may only run against a local database.');
  }
}

async function getDemoUser() {
  if (!authId || authId.startsWith('replace_me')) {
    throw new Error(
      'Set DEMO_SUPABASE_AUTH_ID to your local Supabase user ID.',
    );
  }

  const matches = await prisma.user.findMany({
    where: { OR: [{ email }, { supabaseAuthId: authId }] },
  });
  if (matches.length > 1) {
    throw new Error('The configured email and Auth ID match different users.');
  }

  const data = {
    email,
    supabaseAuthId: authId,
    displayName: process.env.DEMO_DISPLAY_NAME ?? 'Wrapped Test User',
    onboardingCompleted: true,
    deletedAt: null,
  };
  return matches[0]
    ? prisma.user.update({ where: { id: matches[0].id }, data })
    : prisma.user.create({ data });
}

async function seedPayments(userId: string) {
  const categories = await prisma.category.findMany();

  for (const [
    index,
    [name, categoryName, type, amount],
  ] of obligations.entries()) {
    const category = categories.find((item) => item.name === categoryName);
    if (!category) throw new Error(`Missing category: ${categoryName}`);

    const obligationId = `wrapped-test-obligation-${index + 1}`;
    const scheduleId = `wrapped-test-schedule-${index + 1}`;
    await prisma.financialObligation.upsert({
      where: { id: obligationId },
      update: { userId, categoryId: category.id },
      create: {
        id: obligationId,
        userId,
        categoryId: category.id,
        name: `[Wrapped Test] ${name}`,
        type,
        status: ObligationStatus.ACTIVE,
        amount,
        currency: Currency.ZAR,
        priority: ObligationPriority.MEDIUM,
        startDate: at(8, 1),
      },
    });
    await prisma.paymentSchedule.upsert({
      where: { id: scheduleId },
      update: { obligationId },
      create: {
        id: scheduleId,
        obligationId,
        frequency: ScheduleFrequency.MONTHLY,
        dayOfMonth: index + 1,
        startDate: at(8, 1),
      },
    });

    for (const month of months) {
      const outcome = month.outcomes[index];
      const dueDate = at(month.number, index + 1);
      const paidAt =
        outcome === 'MISSED'
          ? null
          : new Date(
              dueDate.getTime() + (outcome === 'LATE' ? 2 : -1) * 86_400_000,
            );
      const occurrenceId = `wrapped-test-occurrence-${month.number}-${index + 1}`;
      const status =
        outcome === 'ON_TIME'
          ? PaymentOccurrenceStatus.PAID
          : outcome === 'LATE'
            ? PaymentOccurrenceStatus.PAID_LATE
            : PaymentOccurrenceStatus.MISSED;

      await prisma.paymentOccurrence.upsert({
        where: { id: occurrenceId },
        update: {
          status,
          paidAt,
          missedAt: outcome === 'MISSED' ? dueDate : null,
        },
        create: {
          id: occurrenceId,
          userId,
          obligationId,
          scheduleId,
          dueDate,
          amountDue: amount,
          currency: Currency.ZAR,
          status,
          sequenceNumber: month.number === 8 ? 1 : 2,
          paidAt,
          missedAt: outcome === 'MISSED' ? dueDate : null,
        },
      });

      if (paidAt) {
        const paymentStatus =
          outcome === 'LATE'
            ? PaymentRecordStatus.LATE
            : PaymentRecordStatus.ON_TIME;
        await prisma.paymentRecord.upsert({
          where: { occurrenceId },
          update: { paidDate: paidAt, paymentStatus },
          create: {
            id: `wrapped-test-payment-${month.number}-${index + 1}`,
            userId,
            occurrenceId,
            obligationId,
            amountPaid: amount,
            currency: Currency.ZAR,
            paidDate: paidAt,
            paymentStatus,
            daysLate: outcome === 'LATE' ? 2 : 0,
          },
        });
      }
    }
  }
}

async function seedWrappedActivity(userId: string) {
  const profile = await prisma.creditProfile.upsert({
    where: { userId },
    update: {
      previousScore: 681,
      currentScore: 697,
      scoreTier: ScoreTier.GOOD,
    },
    create: {
      userId,
      previousScore: 681,
      currentScore: 697,
      scoreTier: ScoreTier.GOOD,
    },
  });
  const badges = await prisma.badgeDefinition.findMany();
  const questions = await prisma.quizQuestion.findMany({ take: 5 });

  for (const month of months) {
    for (const [index, score] of month.score.entries()) {
      const before = index === 0 ? score : month.score[0];
      const id = `wrapped-test-score-${month.number}-${index + 1}`;
      const data = {
        userId,
        creditProfileId: profile.id,
        eventType: ScoreEventType.MANUAL_ADJUSTMENT,
        pointsDelta: score - before,
        scoreBefore: before,
        scoreAfter: score,
        explanation: 'Monthly Wrapped test score movement.',
        createdAt: at(month.number, index === 0 ? 1 : 28, 20),
      };
      await prisma.scoreEvent.upsert({
        where: { id },
        update: data,
        create: { id, ...data },
      });
    }

    for (const [index, code] of month.badges.entries()) {
      const badge = badges.find((item) => item.code === code);
      if (!badge) throw new Error(`Missing badge: ${code}`);
      const earnedAt = at(month.number, 8 + index * 10);
      await prisma.userBadge.upsert({
        where: {
          userId_badgeDefinitionId: { userId, badgeDefinitionId: badge.id },
        },
        update: { earnedAt },
        create: {
          userId,
          badgeDefinitionId: badge.id,
          progress: badge.criteriaValue,
          earnedAt,
        },
      });
    }

    for (const [index, day] of month.quizDays.entries()) {
      const quizDate = at(month.number, day, 0);
      const data = {
        userId,
        type: QuizSessionType.DAILY,
        quizDate,
        status: QuizSessionStatus.COMPLETED,
        startedAt: at(month.number, day, 16),
        completedAt: at(month.number, day, 17),
        score: 5,
        totalQuestions: 5,
        questionIds: questions.map((question) => question.id),
        coinsAwarded: 15,
        xpAwarded: 25,
      };
      await prisma.quizSession.upsert({
        where: { userId_type_quizDate: { userId, type: data.type, quizDate } },
        update: data,
        create: {
          id: `wrapped-test-quiz-${month.number}-${index + 1}`,
          ...data,
        },
      });
    }

    const coinEvents = [
      [UserEventType.PAYMENT_ON_TIME, 20, 'Paid an obligation on time'],
      [UserEventType.QUIZ_COMPLETED, 15, 'Completed a quiz'],
      [UserEventType.BADGE_EARNED, 50, 'Earned a streak badge'],
    ] as const;
    for (const [index, [eventType, amount, reason]] of coinEvents.entries()) {
      const eventId = `wrapped-test-event-${month.number}-${index + 1}`;
      const createdAt = at(month.number, 3 + index * 8, 10);
      await prisma.userEvent.upsert({
        where: { id: eventId },
        update: { eventType, createdAt },
        create: {
          id: eventId,
          userId,
          eventType,
          sourceType: UserEventSourceType.SYSTEM,
          createdAt,
        },
      });
      await prisma.rewardTransaction.upsert({
        where: { id: `wrapped-test-reward-${month.number}-${index + 1}` },
        update: { amount, reason, createdAt },
        create: {
          id: `wrapped-test-reward-${month.number}-${index + 1}`,
          userId,
          sourceEventId: eventId,
          type: RewardTransactionType.EARNED,
          amount,
          balanceAfter: amount,
          reason,
          createdAt,
        },
      });
    }
  }
}

async function main() {
  assertLocalDatabase();
  await seedCategories(prisma);
  await seedBadges(prisma);
  await seedQuizzes(prisma);
  const user = await getDemoUser();
  await seedPayments(user.id);
  await seedWrappedActivity(user.id);
  console.log(
    `Wrapped test data seeded for August and September 2026: ${email}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
