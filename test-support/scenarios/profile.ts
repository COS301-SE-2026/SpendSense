import {createUser, type E2eUser, type E2eUserInput} from '../factories/user';


type ProfileScenarioStore={
    user: {
        create: (args: {data: Record<string, unknown>})=> Promise<E2eUser>;

    };
    creditProfile:{
        upsert: (args: {
            where: {userId: string};
            create: Record<string, unknown>;
            update: Record<string, unknown>;
        })=> Promise<{id: string; scoreTier: string}>;
    };

    gamificationProfile: {
        upsert: (args:{
            where: {userId: string};
            create: Record<string, unknown>;
            update: Record<string, unknown>;
        })=> Promise<{id: string}>;
    };

    userPreference: {
        upsert:(args:{
            where: {userId: string};
            create: Record<string, unknown>;
            update: Record<string, unknown>;
        })=> Promise<{id: string}>;
    };
};

export type ProfileProgress={
    mascotLevel: number;
    coinBalance: number;
    currentPaymentStreak: number;
    scoreTier: 'BUILDING'|'FAIR'|'GOOD'|'EXCELLENT'|'ELITE';
};

const defaultProgress: ProfileProgress={
    mascotLevel: 6,
    coinBalance: 1250,
    currentPaymentStreak: 28,
    scoreTier: 'GOOD',
};

export async function createUserWithProfileProgress(
    prisma: ProfileScenarioStore,
    userOverrides: E2eUserInput={},
    progressOverrides: Partial<ProfileProgress>={},

){
    const user= await createUser(prisma, {
        displayName: 'E2E Profile User',
        ...userOverrides,
    });
    const progress=await addProfileProgressForUser(
        prisma,
        user,
        progressOverrides,
    );
    return {user, progress};
}

export async function addProfileProgressForUser(
    prisma: Omit<ProfileScenarioStore, 'user'>,
    user: Pick<E2eUser, 'id'>,
    progressOverrides: Partial<ProfileProgress> ={},
): Promise<ProfileProgress> {
    const progress={...defaultProgress, ...progressOverrides};

    await prisma.creditProfile.upsert({
        where: {userId: user.id},
        create: {userId: user.id, scoreTier: progress.scoreTier},
        update: {scoreTier: progress.scoreTier},
    });

    await prisma.gamificationProfile.upsert({
        where: {userId: user.id},
        create: {
            userId: user.id,
            mascotLevel: progress.mascotLevel,
            coinBalance: progress.coinBalance,
            currentPaymentStreak: progress.currentPaymentStreak,
        },
        update: {
            mascotLevel: progress.mascotLevel,
            coinBalance: progress.coinBalance,
            currentPaymentStreak: progress.currentPaymentStreak,
        },
    });
    
    await prisma.userPreference.upsert({
        where: {userId: user.id},
        create:{
            userId: user.id,
            theme: 'SYSTEM',
            currency: 'ZAR',
            language: 'en',
            reducedMotion: false,
        },
        update: {},
    });

    return progress;

}