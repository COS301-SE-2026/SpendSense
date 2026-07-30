import { createFinancialOccurrence, createObligationWithSchedule, createResolvedPayment, type FinancialHealthStore } from '../factories/financial-health';
import { createUser, type E2eUser, type E2eUserInput } from '../factories/user';

const DAY_MS = 24 * 60 * 60 * 1000;

type CreditScoreScenarioStore = FinancialHealthStore & {
    user: {
        create: (args: { data: Record<string, unknown> }) => Promise<E2eUser>;
        update: (args: {
            where: { id: string };
            data: Record<string, unknown>;
        }) => Promise<E2eUser>;
    };
    category: {
        findFirst: (args: {
            where: { name: string; type: string };
        }) => Promise<{ id: string } | null>;
    };
};
function startOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),);
}
function addUtcDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAY_MS);
}
function addUtcMonths(date: Date, months: number): Date {
    const day = date.getUTCDate();
    const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),);
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
    return target;
}
async function findObligationCategory(prisma: CreditScoreScenarioStore, name: string) {
    const category = await prisma.category.findFirst({
        where: {
            name,
            type: 'OBLIGATION',
        },
    });
    if (!category) {
        throw new Error(`Mising the ${name} obligation category.`,);
    }
    return category;
}
export async function createUserWithMissedCriticalPayment(prisma: CreditScoreScenarioStore, userOverrides: E2eUserInput = {}) {
    const today = startOfUtcDay(new Date());
    let user = await createUser(prisma, userOverrides);
    user = await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            monthlyBudget: 10_000,
            createdAt: addUtcMonths(today, -12),
        },
    });

    const [rentCategory, subscriptionCategory, utilityCategory] = await Promise.all([
        findObligationCategory(prisma, 'Rent'),
        findObligationCategory(prisma, 'Subscription'),
        findObligationCategory(prisma, 'Utility'),
    ]);

    const rent = await createObligationWithSchedule(prisma, {
        userId: user.id,
        categoryId: rentCategory.id,
        name: 'E2E Critical Rent',
        type: 'RENT',
        amount: 2_500,
        priority: 'CRITICAL',
        startDate: addUtcMonths(today, -12),
        frequency: 'MONTHLY',
    });

    const subscription = await createObligationWithSchedule(prisma, {
        userId: user.id,
        categoryId: subscriptionCategory.id,
        name: 'E2E Subscription',
        type: 'SUBSCRIPTION',
        amount: 500,
        priority: 'MEDIUM',
        startDate: addUtcMonths(today, -12),
        frequency: 'MONTHLY',
    });

    const utility = await createObligationWithSchedule(prisma, {
        userId: user.id,
        categoryId: utilityCategory.id,
        name: 'E2E Utility',
        type: 'UTILITY',
        amount: 700,
        priority: 'HIGH',
        startDate: addUtcMonths(today, -12),
        frequency: 'MONTHLY',
    });

    const managedObligations = [rent, subscription, utility];
    const onTimePayments: Awaited<ReturnType<typeof createResolvedPayment>>[] = [];

    for (let index = 0; index < 6; index += 1) {
        const managed = managedObligations[index % managedObligations.length];
        const dueDate = addUtcMonths(today, index - 6);
        onTimePayments.push(await createResolvedPayment(prisma, {
            userId: user.id,
            obligationId: managed.obligation.id,
            scheduleId: managed.schedule.id,
            dueDate,
            amountDue: managed.obligation.type === 'RENT' ? 2_500 : managed.obligation.type === 'UTILITY' ? 700 : 500,
            sequenceNumber: index + 1,
            paymentStatus: 'ON_TIME',
            paidDate: dueDate,
            notes: 'On-time hitory for credit-score E2E scenario.',
        }),
        );
    }

    const missedDueDate = addUtcDays(today, -10);

    const missedCriticalOccurrence = await createFinancialOccurrence(prisma, {
        userId: user.id,
        obligationId: rent.obligation.id,
        scheduleId: rent.schedule.id,
        dueDate: missedDueDate,
        amountDue: 2_500,
        sequenceNumber: 7,
        status: 'MISSED',
        missedAt: addUtcDays(missedDueDate, 1),
    });

    return {
        user,
        rent: rent.obligation,
        missedCriticalOccurrence,
        onTimePayments,
        expectedRiskCap: 580,
    };
}
