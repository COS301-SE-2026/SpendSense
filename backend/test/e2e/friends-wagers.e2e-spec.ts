import {afterAll,beforeEach,describe,expect,it} from '@jest/globals';
import {createApiE2eFixture} from './fixtures';
import {createE2eAccessToken} from '../../../test-support/auth/e2e-auth';
import {createMutualFriendship} from '../../../test-support/factories/friends';
import {createFriendshipScenario, createThreeUsersForPrivacyFlow,createTwoUsersForFriendFlow} from '../../../test-support/scenarios/friends-wagers';

const TEST_SECRET='e2e-tester-secret';

function expectDataEnvelope(body:Record<string,unknown>){
    expect(Object.keys(body)).toEqual(['data']);
}

function expectErrorEnvelope(
    body:Record<string,unknown>,
    statusCode:number,
    ){
        expect(Object.keys(body).sort()).toEqual([
            'message',
            'path',
            'statusCode',
            'timestamp',
        ]);
        expect(body.statusCode).toBe(statusCode);
        expect(typeof body.message).toBe('string');
        expect(typeof body.timestamp).toBe('string');
        expect(typeof body.path).toBe('string');
    }

function expectPrivacySafeFriend(friend:Record<string,unknown>){
    expect(Object.keys(friend).sort()).toEqual([
        'avatarUrl',
        'badgeCount',
        'currentPaymentStreak',
        'displayName',
        'friendId',
        'friendshipId',
        'scoreTier',
    ]);
    expect(friend).not.toHaveProperty('email');
    expect(friend).not.toHaveProperty('supabaseAuthId');
    expect(friend).not.toHaveProperty('monthlyBudget');
    expect(friend).not.toHaveProperty('obligations');
    expect(friend).not.toHaveProperty('payments');
    expect(friend).not.toHaveProperty('creditProfile');
    expect(friend).not.toHaveProperty('gamificationProfile');
}

async function setSocialState(
    prisma:ReturnType<typeof createApiE2eFixture> extends Promise<infer T>
        ?T extends {prisma:infer P}
            ?P
            :never
        :never,
    userId:string,
    coinBalance:number,
    currentPaymentStreak:number,
    ){
        await prisma.gamificationProfile.update({
            where:{userId},
            data:{
                coinBalance,
                currentPaymentStreak,
                longestPaymentStreak:currentPaymentStreak,
            },
        });
    }

describe('Friends and Wagers E2E',()=>{
    const originalSecret=process.env.SCHEDULER_SECRET;
    beforeEach(()=>{
        process.env.SCHEDULER_SECRET=TEST_SECRET;
    });
    afterAll(()=>{
        if(originalSecret===undefined){
            delete process.env.SCHEDULER_SECRET;
            return;
        }
        process.env.SCHEDULER_SECRET=originalSecret;
    });

    describe('Friends',()=>{
        it('allows one authenticated user to search for another user without exposing private fields',async()=>{
            const e2e=await createApiE2eFixture();
            try{
                const {userA,userB}=await createTwoUsersForFriendFlow(e2e.prisma as never);
                const tokenA=await createE2eAccessToken(userA);
                const response=await e2e.request
                    .get('/api/v1/friends/search')
                    .query({query:'E2E Friend User B'})
                    .set('Authorization',`Bearer ${tokenA}`)
                    .expect(200);
                expectDataEnvelope(response.body as Record<string,unknown>);
                expect(response.body.data).toEqual([
                    {
                        id:userB.id,
                        displayName:'E2E Friend User B',
                        avatarUrl:null,
                    },
                ]);
                expect(response.body.data[0]).not.toHaveProperty('email');
                expect(response.body.data[0]).not.toHaveProperty('supabaseAuthId');
                expect(response.body.data[0]).not.toHaveProperty('monthlyBudget');
                expect(response.body.data[0]).not.toHaveProperty('obligations');
                expect(response.body.data[0]).not.toHaveProperty('payments');
            }finally{
                await e2e.close();
            }
        });
        it('completes request, accept, list, detail and removal for two accounts',async()=>{
            const e2e=await createApiE2eFixture();
            try{
                const {userA,userB}=await createTwoUsersForFriendFlow(e2e.prisma as never);
                const tokenA=await createE2eAccessToken(userA);
                const tokenB=await createE2eAccessToken(userB);
                const createResponse=await e2e.request
                    .post('/api/v1/friends/requests')
                    .set('Authorization',`Bearer ${tokenA}`)
                    .send({
                        receiverId:userB.id,
                    })
                    .expect(201);
                expectDataEnvelope(createResponse.body as Record<string,unknown>);
                expect(createResponse.body.data).toMatchObject({
                    senderId:userA.id,
                    receiverId:userB.id,
                    status:'PENDING',
                });
                const requestId=createResponse.body.data.id as string;
                const outgoingResponse=await e2e.request
                    .get('/api/v1/friends/requests')
                    .query({direction:'outgoing'})
                    .set('Authorization',`Bearer ${tokenA}`)
                    .expect(200);
                expectDataEnvelope(outgoingResponse.body as Record<string,unknown>);
                expect(outgoingResponse.body.data).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            id:requestId,
                            senderId:userA.id,
                            receiverId:userB.id,
                            status:'PENDING',
                        }),
                    ]),
                );
                const incomingResponse=await e2e.request
                    .get('/api/v1/friends/requests')
                    .query({direction:'incoming'})
                    .set('Authorization',`Bearer ${tokenB}`)
                    .expect(200);
                expectDataEnvelope(incomingResponse.body as Record<string,unknown>);
                expect(incomingResponse.body.data).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            id:requestId,
                            senderId:userA.id,
                            receiverId:userB.id,
                            status:'PENDING',
                        }),
                    ]),
                );
                const acceptResponse=await e2e.request
                    .patch(`/api/v1/friends/requests/${requestId}/accept`)
                    .set('Authorization',`Bearer ${tokenB}`)
                    .expect(200);
                expectDataEnvelope(acceptResponse.body as Record<string,unknown>);
                expect(acceptResponse.body.data.request).toMatchObject({
                    id:requestId,
                    status:'ACCEPTED',
                });
                expectPrivacySafeFriend(
                    acceptResponse.body.data.friendship as Record<string,unknown>,
                );
                const friendshipA=await e2e.prisma.friendship.findUnique({
                    where:{
                        userId_friendId:{
                            userId:userA.id,
                            friendId:userB.id,
                        },
                    },
                });
                const friendshipB=await e2e.prisma.friendship.findUnique({
                    where:{
                        userId_friendId:{
                            userId:userB.id,
                            friendId:userA.id,
                        },
                    },
                });
                expect(friendshipA).not.toBeNull();
                expect(friendshipB).not.toBeNull();
                const listResponse=await e2e.request
                    .get('/api/v1/friends')
                    .set('Authorization',`Bearer ${tokenA}`)
                    .expect(200);
                expectDataEnvelope(listResponse.body as Record<string,unknown>);
                expect(listResponse.body.data).toHaveLength(1);
                expect(listResponse.body.data[0]).toMatchObject({
                    friendId:userB.id,
                    displayName:'E2E Friend User B',
                });
                expectPrivacySafeFriend(
                    listResponse.body.data[0] as Record<string,unknown>,
                );
                const detailResponse=await e2e.request
                    .get(`/api/v1/friends/${userB.id}`)
                    .set('Authorization',`Bearer ${tokenA}`)
                    .expect(200);
                expectDataEnvelope(detailResponse.body as Record<string,unknown>);
                expect(detailResponse.body.data).toMatchObject({
                    friendId:userB.id,
                    displayName:'E2E Friend User B',
                });
                expectPrivacySafeFriend(
                    detailResponse.body.data as Record<string,unknown>,
                );
                const removeResponse=await e2e.request
                    .delete(`/api/v1/friends/${userB.id}`)
                    .set('Authorization',`Bearer ${tokenA}`)
                    .expect(200);
                expect(removeResponse.body).toEqual({
                    data:{
                        friendId:userB.id,
                        removed:true,
                    },
                });
                const remainingFriendships=await e2e.prisma.friendship.count({
                    where:{
                        OR:[{
                            userId:userA.id,
                            friendId:userB.id,
                        },{
                            userId:userB.id,
                            friendId:userA.id,
                        }],
                    },
                });
                expect(remainingFriendships).toBe(0);
                await e2e.request
                    .get(`/api/v1/friends/${userB.id}`)
                    .set('Authorization',`Bearer ${tokenA}`)
                    .expect(404);
            }finally{
                await e2e.close();
            }
        });
        it('prevents an unrelated user from reading another users friend detail',async()=>{
            const e2e=await createApiE2eFixture();
            try{
                const {userA,userB,userC}=await createThreeUsersForPrivacyFlow(
                    e2e.prisma as never,
                );
                await createMutualFriendship(
                    e2e.prisma as never,
                    userA.id,
                    userB.id,
                );
                const tokenC=await createE2eAccessToken(userC);
                const response=await e2e.request
                    .get(`/api/v1/friends/${userB.id}`)
                    .set('Authorization',`Bearer ${tokenC}`)
                    .expect(404);
                expectErrorEnvelope(
                    response.body as Record<string,unknown>,
                    404,
                );
            }finally{
                await e2e.close();
            }
        });
        it('allows an incoming friend request to be declined',async()=>{
            const e2e=await createApiE2eFixture();
            try{
                const {userA,userB}=await createTwoUsersForFriendFlow(e2e.prisma as never);
                const tokenA=await createE2eAccessToken(userA);
                const tokenB=await createE2eAccessToken(userB);
                const requestResponse=await e2e.request
                    .post('/api/v1/friends/requests')
                    .set('Authorization',`Bearer ${tokenA}`)
                    .send({
                        receiverId:userB.id,
                    })
                    .expect(201);
                const requestId=requestResponse.body.data.id as string;
                const declineResponse=await e2e.request
                    .patch(`/api/v1/friends/requests/${requestId}/decline`)
                    .set('Authorization',`Bearer ${tokenB}`)
                    .expect(200);
                expect(declineResponse.body.data).toMatchObject({
                    id:requestId,
                    status:'DECLINED',
                });
            }finally{
                await e2e.close();
            }
        });
        it('allows an outgoing friend request to be cancelled',async()=>{
            const e2e=await createApiE2eFixture();
            try{
                const {userA,userB}=await createTwoUsersForFriendFlow(e2e.prisma as never);
                const tokenA=await createE2eAccessToken(userA);
                const requestResponse=await e2e.request
                    .post('/api/v1/friends/requests')
                    .set('Authorization',`Bearer ${tokenA}`)
                    .send({
                        receiverId:userB.id,
                    })
                    .expect(201);
                const requestId=requestResponse.body.data.id as string;
                const cancelResponse=await e2e.request
                    .delete(`/api/v1/friends/requests/${requestId}`)
                    .set('Authorization',`Bearer ${tokenA}`)
                    .expect(200);
                expect(cancelResponse.body).toEqual({
                    data:{
                        id:requestId,
                        status:'CANCELLED',
                    },
                });
            }finally{
                await e2e.close();
            }
        });
        it('returns a friend scoped streak leaderboard containing the caller and friends',async()=>{
            const e2e=await createApiE2eFixture();
            try{
                const {userA,userB}=await createFriendshipScenario(e2e.prisma as never);
                const tokenA=await createE2eAccessToken(userA);
                await setSocialState(e2e.prisma,userA.id,0,5);
                await setSocialState(e2e.prisma,userB.id,0,3);
                const response=await e2e.request
                    .get('/api/v1/friends/leaderboard')
                    .query({metric:'streak'})
                    .set('Authorization',`Bearer ${tokenA}`)
                    .expect(200);
                expectDataEnvelope(response.body as Record<string,unknown>);
                expect(response.body.data).toEqual([
                    {
                        rank:1,
                        userId:userA.id,
                        displayName:'E2E Friend User A',
                        avatarUrl:null,
                        isSelf:true,
                        value:5,
                    },{
                        rank:2,
                        userId:userB.id,
                        displayName:'E2E Friend User B',
                        avatarUrl:null,
                        isSelf:false,
                        value:3,
                    }
                ]);
            }finally{
                await e2e.close();
            }
        });
    });

    describe('Wagers',()=>{
        it('creates, lists and retrieves a wager while protecting the detail from unrelated users',async()=>{
            const e2e=await createApiE2eFixture();
            try{
                const {userA,userB,userC}=await createThreeUsersForPrivacyFlow(
                    e2e.prisma as never,
                );
                await createMutualFriendship(
                    e2e.prisma as never,
                    userA.id,
                    userB.id,
                );
                await setSocialState(e2e.prisma,userA.id,200,5);
                await setSocialState(e2e.prisma,userB.id,200,5);
                const tokenA=await createE2eAccessToken(userA);
                const tokenB=await createE2eAccessToken(userB);
                const tokenC=await createE2eAccessToken(userC);
                const createResponse=await e2e.request
                    .post('/api/v1/wagers')
                    .set('Authorization',`Bearer ${tokenA}`)
                    .send({
                        opponentId:userB.id,
                        taskType:'MAINTAIN_PAYMENT_STREAK',
                        stakeAmount:50,
                        durationDays:2,
                    })
                    .expect(201);
                expectDataEnvelope(createResponse.body as Record<string,unknown>);
                expect(createResponse.body.data).toMatchObject({
                    creatorId:userA.id,
                    opponentId:userB.id,
                    taskType:'MAINTAIN_PAYMENT_STREAK',
                    stakeAmount:50,
                    status:'PENDING',
                    durationDays:2,
                    startDate:null,
                    endDate:null,
                    resolvedAt:null,
                    creatorOutcome:null,
                    opponentOutcome:null,
                    isCreator:true,
                });
                const wagerId=createResponse.body.data.id as string;
                const invite=await e2e.prisma.notification.findFirst({
                    where:{
                        userId:userB.id,
                        type:'WAGER_INVITE',
                        sourceId:wagerId,
                    },
                });
                expect(invite).not.toBeNull();
                const creatorList=await e2e.request
                    .get('/api/v1/wagers')
                    .query({status:'PENDING'})
                    .set('Authorization',`Bearer ${tokenA}`)
                    .expect(200);
                expectDataEnvelope(creatorList.body as Record<string,unknown>);
                expect(creatorList.body.data).toHaveLength(1);
                expect(creatorList.body.data[0]).toMatchObject({
                    id:wagerId,
                    creatorId:userA.id,
                    opponentId:userB.id,
                    status:'PENDING',
                    isCreator:true,
                });
                const opponentList=await e2e.request
                    .get('/api/v1/wagers')
                    .query({status:'PENDING'})
                    .set('Authorization',`Bearer ${tokenB}`)
                    .expect(200);
                expect(opponentList.body.data).toHaveLength(1);
                expect(opponentList.body.data[0]).toMatchObject({
                    id:wagerId,
                    creatorId:userA.id,
                    opponentId:userB.id,
                    isCreator:false,
                });
                const detailResponse=await e2e.request
                    .get(`/api/v1/wagers/${wagerId}`)
                    .set('Authorization',`Bearer ${tokenA}`)
                    .expect(200);

                expectDataEnvelope(detailResponse.body as Record<string,unknown>);
                expect(detailResponse.body.data).toMatchObject({
                    id:wagerId,
                    creatorId:userA.id,
                    creatorDisplayName:'E2E Friend User A',
                    opponentId:userB.id,
                    opponentDisplayName:'E2E Friend User B',
                    stakeAmount:50,
                    status:'PENDING',
                });
                expect(detailResponse.body.data).not.toHaveProperty('email');
                expect(detailResponse.body.data).not.toHaveProperty('obligations');
                expect(detailResponse.body.data).not.toHaveProperty('payments');
                const forbiddenResponse=await e2e.request
                    .get(`/api/v1/wagers/${wagerId}`)
                    .set('Authorization',`Bearer ${tokenC}`)
                    .expect(403);
                expectErrorEnvelope(
                    forbiddenResponse.body as Record<string,unknown>,
                    403,
                );
            }finally{
                await e2e.close();
            }
        });
        it('declines and cancals pending wagers without moving any coins',async()=>{
            const e2e=await createApiE2eFixture();
            try{
                const {userA,userB}=await createFriendshipScenario(e2e.prisma as never);
                const tokenA=await createE2eAccessToken(userA);
                const tokenB=await createE2eAccessToken(userB);
                await setSocialState(e2e.prisma,userA.id,200,5);
                await setSocialState(e2e.prisma,userB.id,200,5);
                const declinedWager=await e2e.request
                    .post('/api/v1/wagers')
                    .set('Authorization',`Bearer ${tokenA}`)
                    .send({
                        opponentId:userB.id,
                        taskType:'MAINTAIN_PAYMENT_STREAK',
                        stakeAmount:50,
                        durationDays:2,
                    })
                    .expect(201);
                const declinedWagerId=declinedWager.body.data.id as string;
                const declineResponse=await e2e.request
                    .patch(`/api/v1/wagers/${declinedWagerId}/decline`)
                    .set('Authorization',`Bearer ${tokenB}`)
                    .expect(200);
                expect(declineResponse.body).toEqual({
                    data:{
                        id:declinedWagerId,
                        status:'DECLINED',
                    },
                });
                const cancelledWager=await e2e.request
                    .post('/api/v1/wagers')
                    .set('Authorization',`Bearer ${tokenA}`)
                    .send({
                        opponentId:userB.id,
                        taskType:'MAINTAIN_PAYMENT_STREAK',
                        stakeAmount:50,
                        durationDays:2,
                    })
                    .expect(201);
                const cancelledWagerId=cancelledWager.body.data.id as string;
                const cancelResponse=await e2e.request
                    .delete(`/api/v1/wagers/${cancelledWagerId}`)
                    .set('Authorization',`Bearer ${tokenA}`)
                    .expect(200);
                expect(cancelResponse.body).toEqual({
                    data:{
                        id:cancelledWagerId,
                        status:'CANCELLED',
                    },
                });
                const profiles=await e2e.prisma.gamificationProfile.findMany({
                    where:{
                        userId:{
                            in:[userA.id,userB.id],
                        },
                    },
                    select:{
                        userId:true,
                        coinBalance:true,
                    },
                });
                expect(profiles).toEqual(
                    expect.arrayContaining([
                        {
                            userId:userA.id,
                            coinBalance:200,
                        },{
                            userId:userB.id,
                            coinBalance:200,
                        },
                    ]),
                );
                const wagerStakeTransactions=await e2e.prisma.rewardTransaction.count({
                    where:{
                        userId:{
                            in:[userA.id,userB.id],
                        },
                        reason:'Wager stake',
                    },
                });
                expect(wagerStakeTransactions).toBe(0);
            }finally{
                await e2e.close();
            }
        });
        it('accepts a wager and escrows both stakes without allowing negative balances',async()=>{
            const e2e=await createApiE2eFixture();
            try{
                const {userA,userB}=await createFriendshipScenario(e2e.prisma as never);
                const tokenA=await createE2eAccessToken(userA);
                const tokenB=await createE2eAccessToken(userB);
                await setSocialState(e2e.prisma,userA.id,200,5);
                await setSocialState(e2e.prisma,userB.id,200,5);
                const createResponse=await e2e.request
                    .post('/api/v1/wagers')
                    .set('Authorization',`Bearer ${tokenA}`)
                    .send({
                        opponentId:userB.id,
                        taskType:'MAINTAIN_PAYMENT_STREAK',
                        stakeAmount:50,
                        durationDays:2,
                    })
                    .expect(201);
                const wagerId=createResponse.body.data.id as string;
                const acceptResponse=await e2e.request
                    .patch(`/api/v1/wagers/${wagerId}/accept`)
                    .set('Authorization',`Bearer ${tokenB}`)
                    .expect(200);
                expectDataEnvelope(acceptResponse.body as Record<string,unknown>);
                expect(acceptResponse.body.data).toMatchObject({
                    id:wagerId,
                    status:'ACTIVE',
                    coinBalance:150,
                });
                expect(acceptResponse.body.data.respondedAt).not.toBeNull();
                expect(acceptResponse.body.data.startDate).not.toBeNull();
                expect(acceptResponse.body.data.endDate).not.toBeNull();
                const profiles=await e2e.prisma.gamificationProfile.findMany({
                    where:{
                        userId:{
                            in:[userA.id,userB.id],
                        },
                    },
                    select:{
                        userId:true,
                        coinBalance:true,
                    },
                });
                expect(profiles).toEqual(
                    expect.arrayContaining([
                        {
                            userId:userA.id,
                            coinBalance:150,
                        },{
                            userId:userB.id,
                            coinBalance:150,
                        },
                    ]),
                );
                profiles.forEach((profile)=>{
                    expect(profile.coinBalance).toBeGreaterThanOrEqual(0);
                });
                const escrowTransactions=await e2e.prisma.rewardTransaction.findMany({
                    where:{
                        userId:{
                            in:[userA.id,userB.id],
                        },
                        type:'SPENT',
                        reason:'Wager stake',
                    },
                    orderBy:{
                        userId:'asc',
                    },
                });
                expect(escrowTransactions).toHaveLength(2);
                expect(escrowTransactions.map((transaction)=>transaction.amount)).toEqual([-50,-50]);
                const storedWager=await e2e.prisma.wager.findUnique({
                    where:{id:wagerId},
                });
                expect(storedWager?.status).toBe('ACTIVE');
                expect(storedWager?.taskSnapshot).toEqual({
                    creatorCurrentPaymentStreak:5,
                    opponentCurrentPaymentStreak:5,
                });
            }finally{
                await e2e.close();
            }
        });
    });

    describe('Wager settlement',()=>{
        it('settles a deterministic winner, conserves coins, creates notifications and cannot settle twice',async()=>{
            const e2e=await createApiE2eFixture();
            try{
                const {userA,userB}=await createFriendshipScenario(e2e.prisma as never);
                const tokenA=await createE2eAccessToken(userA);
                const tokenB=await createE2eAccessToken(userB);
                await setSocialState(e2e.prisma,userA.id,200,5);
                await setSocialState(e2e.prisma,userB.id,200,5);
                const createResponse=await e2e.request
                    .post('/api/v1/wagers')
                    .set('Authorization',`Bearer ${tokenA}`)
                    .send({
                        opponentId:userB.id,
                        taskType:'MAINTAIN_PAYMENT_STREAK',
                        stakeAmount:50,
                        durationDays:1,
                    })
                    .expect(201);
                const wagerId=createResponse.body.data.id as string;
                await e2e.request
                    .patch(`/api/v1/wagers/${wagerId}/accept`)
                    .set('Authorization',`Bearer ${tokenB}`)
                    .expect(200);
                await e2e.prisma.gamificationProfile.update({
                    where:{userId:userB.id},
                    data:{
                        currentPaymentStreak:4,
                    },
                });
                const startDate=new Date(Date.now()-2*24*60*60*1000);
                const endDate=new Date(Date.now()-24*60*60*1000);
                await e2e.prisma.wager.update({
                    where:{id:wagerId},
                    data:{
                        startDate,
                        endDate,
                    },
                });
                const firstRun=await e2e.request
                    .post('/api/v1/scheduler/run')
                    .set('x-scheduler-secret',TEST_SECRET)
                    .expect(201);
                expectDataEnvelope(firstRun.body as Record<string,unknown>);
                expect(firstRun.body.data.resolvedWagerCount).toBe(1);
                const settled=await e2e.prisma.wager.findUnique({
                    where:{id:wagerId},
                });
                expect(settled?.status).toBe('COMPLETED');
                expect(settled?.creatorOutcome).toBe('WON');
                expect(settled?.opponentOutcome).toBe('LOST');
                expect(settled?.resolvedAt).not.toBeNull();
                const profilesAfterSettlement=await e2e.prisma.gamificationProfile.findMany({
                    where:{
                        userId:{
                            in:[userA.id,userB.id],
                        },
                    },
                    select:{
                        userId:true,
                        coinBalance:true,
                    },
                });
                expect(profilesAfterSettlement).toEqual(
                    expect.arrayContaining([
                        {
                            userId:userA.id,
                            coinBalance:250,
                        },{
                            userId:userB.id,
                            coinBalance:150,
                        },
                    ]),
                );
                const combinedBalance=profilesAfterSettlement.reduce(
                    (total,profile)=>total+profile.coinBalance,
                    0,
                );
                expect(combinedBalance).toBe(400);
                profilesAfterSettlement.forEach((profile)=>{
                    expect(profile.coinBalance).toBeGreaterThanOrEqual(0);
                });
                const winnerTransaction=await e2e.prisma.rewardTransaction.findFirst({
                    where:{
                        userId:userA.id,
                        type:'EARNED',
                        amount:100,
                    },
                });
                expect(winnerTransaction).not.toBeNull();
                const resultNotifications=await e2e.prisma.notification.findMany({
                    where:{
                        type:'WAGER_RESULT',
                        sourceId:wagerId,
                        userId:{
                            in:[userA.id,userB.id],
                        },
                    },
                });
                expect(resultNotifications).toHaveLength(2);
                const transactionsBeforeSecondRun=await e2e.prisma.rewardTransaction.count({
                    where:{
                        userId:{
                            in:[userA.id,userB.id],
                        },
                    },
                });
                const notificationsBeforeSecondRun=await e2e.prisma.notification.count({
                    where:{
                        type:'WAGER_RESULT',
                        sourceId:wagerId,
                    },
                });
                const secondRun=await e2e.request
                    .post('/api/v1/scheduler/run')
                    .set('x-scheduler-secret',TEST_SECRET)
                    .expect(201);

                expect(secondRun.body.data.resolvedWagerCount).toBe(0);
                const transactionsAfterSecondRun=await e2e.prisma.rewardTransaction.count({
                    where:{
                        userId:{
                            in:[userA.id,userB.id],
                        },
                    },
                });
                const notificationsAfterSecondRun=await e2e.prisma.notification.count({
                    where:{
                        type:'WAGER_RESULT',
                        sourceId:wagerId,
                    },
                });
                expect(transactionsAfterSecondRun).toBe(transactionsBeforeSecondRun);
                expect(notificationsAfterSecondRun).toBe(notificationsBeforeSecondRun);
                const profilesAfterSecondRun=await e2e.prisma.gamificationProfile.findMany({
                    where:{
                        userId:{
                            in:[userA.id,userB.id],
                        },
                    },
                    select:{
                        coinBalance:true,
                    },
                });
                expect(profilesAfterSecondRun.reduce(
                    (total,profile)=>total+profile.coinBalance,
                    0,
                )).toBe(400);
            }finally{
                await e2e.close();
            }
        });
        it('settles a draw by returning each stake and preserves the total balance',async()=>{
            const e2e=await createApiE2eFixture();
            try{
                const {userA,userB}=await createFriendshipScenario(e2e.prisma as never);
                const tokenA=await createE2eAccessToken(userA);
                const tokenB=await createE2eAccessToken(userB);
                await setSocialState(e2e.prisma,userA.id,200,5);
                await setSocialState(e2e.prisma,userB.id,200,5);
                const createResponse=await e2e.request
                    .post('/api/v1/wagers')
                    .set('Authorization',`Bearer ${tokenA}`)
                    .send({
                        opponentId:userB.id,
                        taskType:'MAINTAIN_PAYMENT_STREAK',
                        stakeAmount:50,
                        durationDays:1,
                    })
                    .expect(201);
                const wagerId=createResponse.body.data.id as string;
                await e2e.request
                    .patch(`/api/v1/wagers/${wagerId}/accept`)
                    .set('Authorization',`Bearer ${tokenB}`)
                    .expect(200);
                const balancesAfterEscrow=await e2e.prisma.gamificationProfile.findMany({
                    where:{
                        userId:{
                            in:[userA.id,userB.id],
                        },
                    },
                    select:{
                        coinBalance:true,
                    },
                });
                expect(balancesAfterEscrow.reduce(
                    (total,profile)=>total+profile.coinBalance,
                    0,
                )).toBe(300);
                await e2e.prisma.wager.update({
                    where:{id:wagerId},
                    data:{
                        startDate:new Date(Date.now()-2*24*60*60*1000),
                        endDate:new Date(Date.now()-24*60*60*1000),
                    },
                });
                const runResponse=await e2e.request
                    .post('/api/v1/scheduler/run')
                    .set('x-scheduler-secret',TEST_SECRET)
                    .expect(201);
                expect(runResponse.body.data.resolvedWagerCount).toBe(1);
                const settled=await e2e.prisma.wager.findUnique({
                    where:{id:wagerId},
                });
                expect(settled?.status).toBe('COMPLETED');
                expect(settled?.creatorOutcome).toBe('DRAW');
                expect(settled?.opponentOutcome).toBe('DRAW');
                const profiles=await e2e.prisma.gamificationProfile.findMany({
                    where:{
                        userId:{
                            in:[userA.id,userB.id],
                        },
                    },
                    select:{
                        userId:true,
                        coinBalance:true,
                    },
                });
                expect(profiles).toEqual(
                    expect.arrayContaining([
                        {
                            userId:userA.id,
                            coinBalance:200,
                        },{
                            userId:userB.id,
                            coinBalance:200,
                        },
                    ]),
                );
                expect(
                    profiles.reduce(
                        (total,profile)=>total+profile.coinBalance,
                        0,
                    ),
                ).toBe(400);
                const refunds=await e2e.prisma.rewardTransaction.findMany({
                    where:{
                        userId:{
                            in:[userA.id,userB.id],
                        },
                        type:'ADJUSTED',
                        reason:'Wager draw - stake returned',
                    },
                });
                expect(refunds).toHaveLength(2);
                expect(refunds.map((transaction)=>transaction.amount).sort()).toEqual([50,50]);
                const notifications=await e2e.prisma.notification.findMany({
                    where:{
                        sourceId:wagerId,
                        type:'WAGER_RESULT',
                    },
                });
                expect(notifications).toHaveLength(2);
            }finally{
                await e2e.close();
            }
        });
    });
});