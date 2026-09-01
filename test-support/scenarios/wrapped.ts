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

export type MonthlyWrappedScenario = {
    user: {
        id: string;
        supabaseAuthId: string;
        email: string;
    };
    year: number;
    month: number;
    badges: {
        first: {
            definition: {
                id: string;
                code: string;
                name: string;
                description: string;
            };
            userBadge: {
                id: string;
                earnedAt: Date | null;
            };
        };
        second: {
            definition: {
                id: string;
                code: string;
                name: string;
                description: string;
            };
            userBadge: {
                id: string;
                earnedAt: Date | null;
            };
        };
    };


    creditProfile: {
        is:string,
        previousScore: number;
        currentScore:number;
    };

    scoreEvents:{
        firstScoreEventInMonth : {
            id:string;
            scoreBefore:number;
            scoreAfter:number;
        };
        lastScoreEventInMonth :{
            id:string;
            scoreBefore:number;
            scoreAfter:number;
        };
    };
};

export async function createMonthlyWrappedScenario(prisma: any, options: MonthlyWrappedScenarioOptions = {}): Promise<MonthlyWrappedScenario> {

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

    // creating credit profile for the user to test score movement
    const creditProfile = await prisma.creditProfile.create({

        data: {
            userId: user.id,
            previousScore: 630,
            currentScore: 660,
            scoreTier: 'GOOD',
        },

    })


    const ScoreEvents = await Promise.all([

        // this is a credit score movement in JULY, this should not count 
        prisma.scoreEvent.create({
            data: {
                userId: user.id,
                creditProfileId: creditProfile.id,
                eventType: 'MANUAL_ADJUSTMENT',
                pointsDelta: 20,
                scoreBefore: 600,
                scoreAfter: 620,
                explanation: 'JULY monthlt score movement',
                createdAt: new Date(Date.UTC(year, month - 2, 10, 12)),

            },
        }),

        // this is the first credit score movement in the current month (currently august) so this should be in wrapped response
        prisma.scoreEvent.create({
            data: {
                userId: user.id,
                creditProfileId: creditProfile.id,
                eventType: 'MANUAL_ADJUSTMENT',
                pointsDelta: 20,
                scoreBefore: 600,
                scoreAfter: 620,
                explanation: 'first monthlt score movement',
                createdAt: new Date(Date.UTC(year, month - 1, 10, 12)),

            },
        }),

        prisma.scoreEvent.create({
            data: {
                userId: user.id,
                creditProfileId: creditProfile.id,
                eventType: 'MANUAL_ADJUSTMENT',
                pointsDelta: 25,
                scoreBefore: 620,
                scoreAfter: 645,
                explanation: 'second monthlt score movement',
                createdAt: new Date(Date.UTC(year, month - 1, 11, 12)),

            },
        }),

        prisma.scoreEvent.create({
            data: {
                userId: user.id,
                creditProfileId: creditProfile.id,
                eventType: 'MANUAL_ADJUSTMENT',
                pointsDelta: -15,
                scoreBefore: 645,
                scoreAfter: 630,
                explanation: 'third monthlt score movement',
                createdAt: new Date(Date.UTC(year, month - 1, 12, 12)),

            },
        }),

        prisma.scoreEvent.create({
            data: {
                userId: user.id,
                creditProfileId: creditProfile.id,
                eventType: 'MANUAL_ADJUSTMENT',
                pointsDelta: 30,
                scoreBefore: 630,
                scoreAfter: 660,
                explanation: 'LAST monthlt score movement',
                createdAt: new Date(Date.UTC(year, month, - 1, 13, 12)),

            },
        }),

        // this is a score event taking place in septermber, therefore wrapped should not include it.
        prisma.scoreEvent.create({
            data: {
                userId: user.id,
                creditProfileId: creditProfile.id,
                eventType: 'MANUAL_ADJUSTMENT',
                pointsDelta: 40,
                scoreBefore: 660,
                scoreAfter: 700,
                explanation: 'Next months first monthlt score movement',
                createdAt: new Date(Date.UTC(year, month ,1, 12)),

            },
        }),

    ])


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
        creditProfile,
        scoreEvents:{
            firstScoreEventInMonth: ScoreEvents[1],
            lastScoreEventInMonth: ScoreEvents[4],
        }        
    };
}

/**
 * Example scenario:
 * const scenario = await createMonthlyWrappedWithBadges(prisma);
 */