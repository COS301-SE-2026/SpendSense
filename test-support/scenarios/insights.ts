import { createFinancialOccurrence, createObligationWithSchedule, createResolvedPayment, type FinancialHealthStore } from '../factories/financial-health';
import { createUser, type E2eUser, type E2eUserInput } from '../factories/user';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

type InsightsScenarioStore = FinancialHealthStore & {
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
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
function startOfUtcMonth(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
function addUtcDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * DAY_MS);
}
function addUtcMonths(date: Date, months: number): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}
function addUtcHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * HOUR_MS);
}

async function findObligationCategory(prisma: InsightsScenarioStore, name: string) {
    const category = await prisma.category.findFirst({
        where: {
            name,
            type: 'OBLIGATION',
        },
    });
    if (!category) {
        throw new Error(`ERROR Missing ${name} obligation category.`,);
    }
    return category;
}

export async function createUserWithInsightHistory(prisma: InsightsScenarioStore, userOverrides: E2eUserInput = {}) {

    const today = startOfUtcDay(new Date());
    const currentMonthStart = startOfUtcMonth(today);
    const previousMonthStart = addUtcMonths(currentMonthStart, -1);
    let user = await createUser(prisma, userOverrides);

    user = await prisma.user.update({
        where: {
            id: user.id,
        },
        data: {
            monthlyBudget: 15_000,
            createdAt: addUtcMonths(currentMonthStart, -12),
        },
    });

    const [rentCategory, subscriptionCategory] = await Promise.all([
        findObligationCategory(prisma, 'Rent'),
        findObligationCategory(prisma, 'Subscription'),
    ]);

    const rent = await createObligationWithSchedule(prisma, {
        userId: user.id,
        categoryId: rentCategory.id,
        name: 'E2E Insights Rent',
        type: 'RENT',
        amount: 1_000,
        priority: 'HIGH',
        startDate: addUtcMonths(currentMonthStart, -3),
        frequency: 'MONTHLY',
    });

    const subscription = await createObligationWithSchedule(prisma, {
        userId: user.id,
        categoryId: subscriptionCategory.id,
        name: 'E2E Insights Subscription',
        type: 'SUBSCRIPTION',
        amount: 899,
        priority: 'MEDIUM',
        startDate: addUtcMonths(currentMonthStart, -3),
        frequency: 'MONTHLY',
    });

    const previousStatuses = ['LATE', 'LATE', 'ON_TIME', 'ON_TIME'] as const;

    for (let index = 0; index < previousStatuses.length; index += 1) {

        const dueDate = addUtcHours(addUtcDays(previousMonthStart, 5 + index), index);

        await createResolvedPayment(prisma, {
            userId: user.id,
            obligationId: rent.obligation.id,
            scheduleId: rent.schedule.id,
            dueDate,
            amountDue: 1_000,
            sequenceNumber: index + 1,
            paymentStatus: previousStatuses[index],
            daysLate: previousStatuses[index] === 'LATE' ? 2 : 0,
            notes: 'Previous-month insight history.',
        });
    }

    const currentStatuses = ['LATE', 'ON_TIME', 'ON_TIME', 'ON_TIME'] as const;

    for (let index = 0; index < currentStatuses.length; index += 1) {
        
        const dueDate = addUtcHours(currentMonthStart, index + 1);

        await createResolvedPayment(prisma, {
            userId: user.id,
            obligationId: rent.obligation.id,
            scheduleId: rent.schedule.id,
            dueDate,
            amountDue: 1_000,
            sequenceNumber: index + 5,
            paymentStatus: currentStatuses[index],
            daysLate: currentStatuses[index] === 'LATE' ? 2 : 0,
            notes: 'Current-month insight history.',
        });
    }

    const upcomingRent = await createFinancialOccurrence(prisma, {
        userId: user.id,
        obligationId: rent.obligation.id,
        scheduleId: rent.schedule.id,
        dueDate: addUtcDays(today, 1),
        amountDue: 1_250,
        sequenceNumber: 9,
        status: 'PENDING',
    });

    const upcomingSubscription = await createFinancialOccurrence(prisma, {
        userId: user.id,
        obligationId: subscription.obligation.id,
        scheduleId: subscription.schedule.id,
        dueDate: addUtcDays(today, 3),
        amountDue: 899,
        sequenceNumber: 1,
        status: 'PENDING',
    });

    return {
        user,
        rent: rent.obligation,
        subscription: subscription.obligation,
        upcomingRent,
        upcomingSubscription,
        expectedOnTimeRate: '62.5%',
        expectedUpcomingAmount: 2_149,
        expectedUpcomingPaymentCount: 2,
    };
}
