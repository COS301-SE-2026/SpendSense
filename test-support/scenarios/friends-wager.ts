import {createUser,type E2eUser,type E2eUserInput} from '../factories/user';
import { createMutualFriendship } from '../factories/friends';
import { createActiveWager } from '../factories/wagers';

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
    gamificationProfile:{
        upsert:(args:{where:{userId:string};update:Record<string,unknown>;create:Record<string,unknown>})=>Promise<unknown>;
    };
};

export async function createTwoUsersForFriendFlow(
    prisma:FriendsWagersScenarioStore,
    ){
        const userA=await createUser(prisma,{
            displayName:'E2E Friend User A',
        });
        const userB=await createUser(prisma,{
            displayName:'E2E Friend User B',
        });
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