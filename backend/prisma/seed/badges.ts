import {
  BadgeCategory,
  BadgeCriteriaType,
  Prisma,
  type PrismaClient,
} from '@prisma/client';

export const defaultBadges = [
  {
    code: 'FIRST_OBLIGATION_CREATED',
    name: 'First Obligation',
    description: 'Created your first tracked financial obligation.',
    category: BadgeCategory.OBLIGATION,
    criteriaType: BadgeCriteriaType.FIRST_OBLIGATION,
    criteriaValue: 1,
    bonusCoins: 20,
    iconKey: 'plus-circle',
    isActive: true,
  },
  {
    code: 'FIRST_ON_TIME_PAYMENT',
    name: 'On-Time Starter',
    description: 'Logged your first on-time payment.',
    category: BadgeCategory.PAYMENT,
    criteriaType: BadgeCriteriaType.FIRST_ON_TIME_PAYMENT,
    criteriaValue: 1,
    bonusCoins: 25,
    iconKey: 'check-circle',
    isActive: true,
  },
  {
    code: 'THREE_PAYMENT_STREAK',
    name: 'Three Payment Streak',
    description: 'Reached a three-payment on-time streak.',
    category: BadgeCategory.STREAK,
    criteriaType: BadgeCriteriaType.PAYMENT_STREAK_COUNT,
    criteriaValue: 3,
    bonusCoins: 50,
    iconKey: 'flame',
    isActive: true,
  },
  {
    code: 'SCORE_650_REACHED',
    name: 'Excellent Progress',
    description: 'Reached a simulated financial health score of 650.',
    category: BadgeCategory.SCORE,
    criteriaType: BadgeCriteriaType.SCORE_REACHED,
    criteriaValue: 650,
    bonusCoins: 100,
    iconKey: 'trending-up',
    isActive: true,
  },
  {
    code: 'FIRST_QUIZ_COMPLETION',
    name: 'Quiz Starter',
    description: 'Completed your first financial knowledge quiz.',
    category: BadgeCategory.QUIZ,
    criteriaType: BadgeCriteriaType.QUIZ_COMPLETED_COUNT,
    criteriaValue: 1,
    bonusCoins: 15,
    iconKey: 'book-open',
    isActive: true,
  },
  {
    code: 'THREE_DAY_KNOWLEDGE_STREAK',
    name: 'Knowledge Builder',
    description: 'Maintained a three-day daily quiz streak.',
    category: BadgeCategory.STREAK,
    criteriaType: BadgeCriteriaType.KNOWLEDGE_STREAK_COUNT,
    criteriaValue: 3,
    bonusCoins: 50,
    iconKey: 'brain',
    isActive: true,
  },
  {
    code: 'DEMO_READY',
    name: 'Demo Ready',
    description: 'Seeded profile for a complete Demo 1 walkthrough.',
    category: BadgeCategory.DEMO,
    criteriaType: BadgeCriteriaType.FIRST_OBLIGATION,
    criteriaValue: 1,
    bonusCoins: 0,
    iconKey: 'sparkles',
    isActive: true,
  },
] satisfies Prisma.BadgeDefinitionCreateInput[];

export async function seedBadges(prisma: PrismaClient) {
  for (const badge of defaultBadges) {
    await prisma.badgeDefinition.upsert({
      where: { code: badge.code },
      update: badge,
      create: badge,
    });
  }
}
