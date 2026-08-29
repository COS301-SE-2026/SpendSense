import {createUser,type E2eUser} from '../factories/user';
import {createMutualFriendship} from '../factories/friends';
import {createActiveWager} from '../factories/wagers';

type FriendsWagersScenarioStore={
    user:{
        create:(args:{data:Record<string,unknown>})=>Promise<E2eUser>;
    };
    friendship:{
        createMany:(args:{
            data:Record<string,unknown>[];
            skipDuplicates?:boolean;
        })=>Promise<unknown>;
    };
    wager:{
        create:(args:{data:Record<string,unknown>})=>Promise<unknown>;
    };
    creditProfile:{
        upsert:(args:{
            where:{userId:string};
            update:Record<string,unknown>;
            create:Record<string,unknown>;
        })=>Promise<unknown>;
    };
    gamificationProfile:{
        upsert:(args:{
            where:{userId:string};
            update:Record<string,unknown>;
            create:Record<string,unknown>;
        })=>Promise<unknown>;
    };
};

async function createSocialProfiles(
    prisma:FriendsWagersScenarioStore,
    userId:string,
    ){
        await prisma.creditProfile.upsert({
            where:{userId},
            update:{},
            create:{
                userId,
                currentScore:600,
                previousScore:600,
                scoreTier:'GOOD',
            },
        });
        await prisma.gamificationProfile.upsert({
            where:{userId},
            update:{},
            create:{
                userId,
            },
        });
    }

export async function createTwoUsersForFriendFlow(
    prisma:FriendsWagersScenarioStore,
    ){
        const userA=await createUser(prisma,{
            displayName:'E2E Friend User A',
        });
        const userB=await createUser(prisma,{
            displayName:'E2E Friend User B',
        });
        await createSocialProfiles(prisma,userA.id);
        await createSocialProfiles(prisma,userB.id);
        return{
            userA,
            userB,
        };
    }

export async function createThreeUsersForPrivacyFlow(
    prisma:FriendsWagersScenarioStore,
    ){
        const userA=await createUser(prisma,{
            displayName:'E2E Friend User A',
        });
        const userB=await createUser(prisma,{
            displayName:'E2E Friend User B',
        });
        const userC=await createUser(prisma,{
            displayName:'E2E Friend User C',
        });
        await createSocialProfiles(prisma,userA.id);
        await createSocialProfiles(prisma,userB.id);
        await createSocialProfiles(prisma,userC.id);
        return{
            userA,
            userB,
            userC,
        };
    }

export async function createFriendshipScenario(
    prisma:FriendsWagersScenarioStore,
    ){
        const {userA,userB}=await createTwoUsersForFriendFlow(prisma);
        await createMutualFriendship(prisma,userA.id,userB.id);
        return{
            userA,
            userB,
        };
    }

export async function createAcceptedWagerScenario(
    prisma:FriendsWagersScenarioStore,
    ){
        const {userA,userB}=await createFriendshipScenario(prisma);
        await prisma.gamificationProfile.upsert({
            where:{userId:userA.id},
            update:{coinBalance:200},
            create:{
                userId:userA.id,
                coinBalance:200,
            },
        });
        await prisma.gamificationProfile.upsert({
            where:{userId:userB.id},
            update:{coinBalance:200},
            create:{
                userId:userB.id,
                coinBalance:200,
            },
        });
        const wager=await createActiveWager(prisma,{
            creatorId:userA.id,
            opponentId:userB.id,
            stakeAmount:50,
        });
        return{
            userA,
            userB,
            wager,
        };
    }