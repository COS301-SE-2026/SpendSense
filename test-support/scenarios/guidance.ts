import {createUser, type E2eUser, type E2eUserInput} from '../factories/user';

type GuidanceScenarioStore={
    user: {
        create: (args: {data: Record<string, unknown>})=> Promise<E2eUser>;
    };
    quizSession: {
        deleteMany: (args: {where: {userId: string; type: 'DAILY'}})=> Promise<unknown>;
        upsert: (args: {
            where: {userId_type_quizDate: {userId: string; type: 'DAILY'; quizDate: Date}};
            create: Record<string, unknown>;
            update: Record<string, unknown>;
        })=> Promise<{id: string}>;
    };
    guidanceState: {
        upsert: (args: {
            where: {userId: string};
            create: Record<string, unknown>;
            update: Record<string, unknown>;
        })=> Promise<{id: string}>;
    };
};

export type GuidanceStateInput={
    tipsEnabled: boolean;
    dailyExpansionEnabled: boolean;
    walkthroughStatus: 'NOT_STARTED'|'IN_PROGRESS'|'COMPLETED'|'SKIPPED';
    walkthroughStep: number;
    dismissedTipIds: string[];
};

const defaultGuidanceState: GuidanceStateInput={
    tipsEnabled: true,
    dailyExpansionEnabled: true,
    walkthroughStatus: 'NOT_STARTED',
    walkthroughStep: 0,
    dismissedTipIds: [],
};

export async function createUserWithGuidanceState(
    prisma: GuidanceScenarioStore,
    userOverrides: E2eUserInput={},
    stateOverrides: Partial<GuidanceStateInput>={},
){
    const user=await createUser(prisma, {...userOverrides});
    const guidance=await addGuidanceStateForUser(prisma, user, stateOverrides);
    return {user, guidance};
}

export async function addGuidanceStateForUser(
    prisma: Omit<GuidanceScenarioStore, 'user'>,
    user: Pick<E2eUser, 'id'>,
    stateOverrides: Partial<GuidanceStateInput>={},
): Promise<GuidanceStateInput> {
    const guidance={...defaultGuidanceState, ...stateOverrides};

    await prisma.guidanceState.upsert({
        where: {userId: user.id},
        create: {userId: user.id, ...guidance},
        update: guidance,
    });

    return guidance;
}

function johannesburgMidnight(now: Date=new Date()): Date {
    const date=new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Johannesburg',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(now);
    return new Date(`${date}T00:00:00+02:00`);
}

// gives the dashboard guide a daily quiz status to react to
export async function completeDailyQuizForUser(
    prisma: Pick<GuidanceScenarioStore, 'quizSession'>,
    user: Pick<E2eUser, 'id'>,
) {
    const quizDate=johannesburgMidnight();

    const completed={
        status: 'COMPLETED',
        completedAt: new Date(),
        score: 3,
        totalQuestions: 3,
    };

    await prisma.quizSession.upsert({
        where: {userId_type_quizDate: {userId: user.id, type: 'DAILY', quizDate}},
        create: {userId: user.id, type: 'DAILY', quizDate, ...completed},
        update: completed,
    });
}

export async function removeDailyQuizForUser(
    prisma: Pick<GuidanceScenarioStore, 'quizSession'>,
    user: Pick<E2eUser, 'id'>,
) {
    await prisma.quizSession.deleteMany({where: {userId: user.id, type: 'DAILY'}});
}
