/**
 * Scenario's for the monthly-wrapped 
 */
import { randomUUID } from 'node:crypto';
import { createUser } from '../factories/user';
import { createBadgeDefinition } from '../factories/badge-definition';
import { createUserBadge } from '../factories/user-badge';

type MonthlyWrappedScenarioOptions = {
    year?: number;
    month?: number;
};

export async function createMonthlyWrappedWithBadges(prisma: any, options: MonthlyWrappedScenarioOptions = {}) {

    const year = options.year ?? 2026;
    const month = options.month ?? 8;
    const uniqueId = randomUUID();
    const user = await createUser(prisma);

    const firstBadge = await createBadgeDefinition(prisma, {
        code: `E2E_WRAPPED_PAYMENT_${uniqueId}`,
        name: 'Payment Starter',
        description: 'Made your first successful payment',
        category: 'PAYMENT',
        criteriaType: 'FIRST_ON_TIME_PAYMENT',
        criteriaValue: 1,
        iconKey: 'payment-starter',
    });
    const secondBadge = await createBadgeDefinition(prisma, {
        code: `E2E_WRAPPED_STREAK_${uniqueId}`,
        name: 'Streak Builder',
        description: 'Built a successful payment streak',
        category: 'STREAK',
        criteriaType: 'PAYMENT_STREAK_COUNT',
        criteriaValue: 3,
        iconKey: 'streak-builder',
    });
    const firstUserBadge = await createUserBadge(prisma, {
        userId: user.id,
        badgeDefinitionId: firstBadge.id,
        progress: 1,
        earnedAt: new Date(Date.UTC(year, month - 1, 5, 10, 0, 0)), // Date.UTC( year, monthIndex, day, hour, minute, second)
    });
    const secondUserBadge = await createUserBadge(prisma, {
        userId: user.id,
        badgeDefinitionId: secondBadge.id,
        progress: 3,
        earnedAt: new Date(Date.UTC(year, month - 1, 20, 10, 0, 0)),
    });

    return {
        user,
        year,
        month,
        badges: {
            first: {
                definition: firstBadge,
                userBadge: firstUserBadge,
            },
            second: {
                definition: secondBadge,
                userBadge: secondUserBadge,
            },
        },
    };
}

/**
 * Example scenario:
 * const scenario = await createMonthlyWrappedWithBadges(prisma);
 */