import {
  BadgeCategory,
  BadgeCriteriaType,
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
    iconKey: 'trending-up',
    isActive: true,
  },
  {
    code: 'DEMO_READY',
    name: 'Demo Ready',
    description: 'Seeded profile for a complete Demo 1 walkthrough.',
    category: BadgeCategory.DEMO,
    criteriaType: BadgeCriteriaType.FIRST_OBLIGATION,
    criteriaValue: 1,
    iconKey: 'sparkles',
    isActive: true,
  },
];

export async function seedBadges(prisma: PrismaClient) {
  for (const badge of defaultBadges) {
    await prisma.badgeDefinition.upsert({
      where: { code: badge.code },
      update: badge,
      create: badge,
    });
  }
}
