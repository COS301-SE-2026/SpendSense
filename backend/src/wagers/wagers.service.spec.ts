import {BadRequestException,ForbiddenException,NotFoundException} from '@nestjs/common';
import {NotificationType,WagerStatus,WagerTaskType} from '@prisma/client';
import {NotificationsService} from '../notifications/notifications.service';
import {PrismaService} from '../prisma/prisma.service';
import {WagersService} from './wagers.service';

describe('WagersService',()=>{
    const prisma={
        $transaction:jest.fn(),
        user:{
            findFirst:jest.fn(),
            findUnique:jest.fn(),
        },
        friendship:{
            findUnique:jest.fn(),
        },
        wager:{
            create:jest.fn(),
            findMany:jest.fn(),
            findUnique:jest.fn(),
        },
    };
    const notificationsService={create:jest.fn()};
    const service=new WagersService(
        prisma as unknown as PrismaService,
        notificationsService as unknown as NotificationsService,
    );
    beforeEach(()=>{
        jest.clearAllMocks();
    });
    it('creates a pending wager against a current friend',async()=>{
        const invitedAt=new Date('2026-08-23T10:00:00.000Z');
        prisma.user.findFirst.mockResolvedValue({
            id:'opponent-id',
        });
        prisma.$transaction
            .mockResolvedValueOnce([
                {id:'friendship-id'},
                {
                    id:'creator-id',
                    displayName:'Creator',
                    gamificationProfile:{
                        coinBalance:100,
                    },
                },
            ])
            .mockImplementationOnce((operation:unknown)=>{
                const tx={
                    wager:{
                        create:jest.fn().mockResolvedValue({
                            id:'wager-id',
                            creatorId:'creator-id',
                            opponentId:'opponent-id',
                            taskType:WagerTaskType.ALL_PAYMENTS_ON_TIME,
                            stakeAmount:50,
                            status:WagerStatus.PENDING,
                            durationDays:7,
                            invitedAt,
                            respondedAt:null,
                            startDate:null,
                            endDate:null,
                            resolvedAt:null,
                            creatorOutcome:null,
                            opponentOutcome:null,
                            creator:{
                                displayName:'Creator',
                            },
                            opponent:{
                                displayName:'Opponent',
                            },
                        }),
                    },
                };
                const callback=operation as (tx:typeof tx)=>Promise<unknown>;
                return callback(tx);
            });
        notificationsService.create.mockResolvedValue(undefined);
        await expect(
            service.createWager('creator-id',{
                opponentId:'opponent-id',
                taskType:WagerTaskType.ALL_PAYMENTS_ON_TIME,
                stakeAmount:50,
                durationDays:7,
            }),
        ).resolves.toEqual({
            id:'wager-id',
            creatorId:'creator-id',
            creatorDisplayName:'Creator',
            opponentId:'opponent-id',
            opponentDisplayName:'Opponent',
            taskType:WagerTaskType.ALL_PAYMENTS_ON_TIME,
            stakeAmount:50,
            status:WagerStatus.PENDING,
            durationDays:7,
            invitedAt,
            respondedAt:null,
            startDate:null,
            endDate:null,
            resolvedAt:null,
            creatorOutcome:null,
            opponentOutcome:null,
            isCreator:true,
        });
    });
    it('creates a wager invite notification for the opponent',async()=>{
        const transactionClient={
            wager:{
                create:jest.fn().mockResolvedValue({
                    id:'wager-id',
                    creatorId:'creator-id',
                    opponentId:'opponent-id',
                    taskType:WagerTaskType.NO_MISSED_PAYMENTS,
                    stakeAmount:25,
                    status:WagerStatus.PENDING,
                    durationDays:7,
                    invitedAt:new Date(),
                    respondedAt:null,
                    startDate:null,
                    endDate:null,
                    resolvedAt:null,
                    creatorOutcome:null,
                    opponentOutcome:null,
                    creator:{
                        displayName:'Creator',
                    },
                    opponent:{
                        displayName:'Opponent',
                    },
                }),
            },
        };
        prisma.user.findFirst.mockResolvedValue({
            id:'opponent-id',
        });
        prisma.$transaction
            .mockResolvedValueOnce([
                {id:'friendship-id'},
                {
                    id:'creator-id',
                    displayName:'Creator',
                    gamificationProfile:{
                        coinBalance:100,
                    },
                },
            ])
            .mockImplementationOnce((operation:unknown)=>{
                const callback=operation as (
                    tx:typeof transactionClient,
                )=>Promise<unknown>;

                return callback(transactionClient);
            });
        notificationsService.create.mockResolvedValue(undefined);
        await service.createWager('creator-id',{
            opponentId:'opponent-id',
            taskType:WagerTaskType.NO_MISSED_PAYMENTS,
            stakeAmount:25,
            durationDays:7,
        });
        expect(notificationsService.create).toHaveBeenCalledWith({
            userId:'opponent-id',
            type:NotificationType.WAGER_INVITE,
            title:'New wager invite',
            message:'Creator invited you to a wager.',
            sourceId:'wager-id',
        },transactionClient);
    });
    it('rejects creating a wager against yourself',async()=>{
        await expect(
            service.createWager('user-id',{
                opponentId:'user-id',
                taskType:WagerTaskType.ALL_PAYMENTS_ON_TIME,
                stakeAmount:50,
                durationDays:7,
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });
    it('returns not found when the opponent does not exist',async()=>{
        prisma.user.findFirst.mockResolvedValue(null);
        await expect(
            service.createWager('creator-id',{
                opponentId:'missing-id',
                taskType:WagerTaskType.ALL_PAYMENTS_ON_TIME,
                stakeAmount:50,
                durationDays:7,
            }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });
    it('rejects creating a wager against a non-friend',async()=>{
        prisma.user.findFirst.mockResolvedValue({
            id:'opponent-id',
        });
        prisma.$transaction.mockResolvedValueOnce([
            null,
            {
                id:'creator-id',
                displayName:'Creator',
                gamificationProfile:{
                    coinBalance:100,
                },
            },
        ]);
        await expect(
            service.createWager('creator-id',{
                opponentId:'opponent-id',
                taskType:WagerTaskType.ALL_PAYMENTS_ON_TIME,
                stakeAmount:50,
                durationDays:7,
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
    it('rejects a wager when the creator has insufficient coins',async()=>{
        prisma.user.findFirst.mockResolvedValue({
            id:'opponent-id',
        });
        prisma.$transaction.mockResolvedValueOnce([
            {id:'friendship-id'},
            {
                id:'creator-id',
                displayName:'Creator',
                gamificationProfile:{
                    coinBalance:25,
                },
            },
        ]);
        await expect(
            service.createWager('creator-id',{
                opponentId:'opponent-id',
                taskType:WagerTaskType.ALL_PAYMENTS_ON_TIME,
                stakeAmount:50,
                durationDays:7,
            }),
        ).rejects.toBeInstanceOf(BadRequestException);
    });
    it('returns not found when the creator profile does not exist',async()=>{
        prisma.user.findFirst.mockResolvedValue({
            id:'opponent-id',
        });
        prisma.$transaction.mockResolvedValueOnce([
            {id:'friendship-id'},
            null,
        ]);
        await expect(
            service.createWager('creator-id',{
                opponentId:'opponent-id',
                taskType:WagerTaskType.ALL_PAYMENTS_ON_TIME,
                stakeAmount:50,
                durationDays:7,
            }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });
    it('lists wagers where the user is either creator or opponent',async()=>{
        prisma.wager.findMany.mockResolvedValue([]);
        await service.listWagers('user-id');
        expect(prisma.wager.findMany).toHaveBeenCalledWith({
            where:{
                OR:[
                    {creatorId:'user-id'},
                    {opponentId:'user-id'},
                ],
            },
            orderBy:{
                invitedAt:'desc',
            },
            select:expect.any(Object),
        });
    });
    it('filters wagers by status when a status is provided',async()=>{
        prisma.wager.findMany.mockResolvedValue([]);
        await service.listWagers(
            'user-id',
            WagerStatus.ACTIVE,
        );
        expect(prisma.wager.findMany).toHaveBeenCalledWith({
            where:{
                OR:[
                    {creatorId:'user-id'},
                    {opponentId:'user-id'},
                ],
                status:WagerStatus.ACTIVE,
            },
            orderBy:{
                invitedAt:'desc',
            },
            select:expect.any(Object),
        });
    });
    it('returns wager summaries with isCreator calculated for the caller',async()=>{
        const invitedAt=new Date('2026-08-23T10:00:00.000Z');
        prisma.wager.findMany.mockResolvedValue([
            {
                id:'wager-id',
                creatorId:'creator-id',
                opponentId:'user-id',
                taskType:WagerTaskType.MAINTAIN_PAYMENT_STREAK,
                stakeAmount:50,
                status:WagerStatus.ACTIVE,
                durationDays:7,
                invitedAt,
                respondedAt:new Date('2026-08-23T11:00:00.000Z'),
                startDate:new Date('2026-08-23T11:00:00.000Z'),
                endDate:new Date('2026-08-30T11:00:00.000Z'),
                resolvedAt:null,
                creatorOutcome:null,
                opponentOutcome:null,
                creator:{
                    displayName:'Creator',
                },
                opponent:{
                    displayName:'Opponent',
                },
            },
        ]);
        await expect(service.listWagers('user-id')).resolves.toMatchObject([
            {
                id:'wager-id',
                creatorId:'creator-id',
                opponentId:'user-id',
                isCreator:false,
            },
        ]);
    });
    it('returns a wager when the caller is a participant',async()=>{
        prisma.wager.findUnique.mockResolvedValue({
            id:'wager-id',
            creatorId:'user-id',
            opponentId:'opponent-id',
            taskType:WagerTaskType.ALL_PAYMENTS_ON_TIME,
            stakeAmount:50,
            status:WagerStatus.PENDING,
            durationDays:7,
            invitedAt:new Date(),
            respondedAt:null,
            startDate:null,
            endDate:null,
            resolvedAt:null,
            creatorOutcome:null,
            opponentOutcome:null,
            creator:{
                displayName:'Creator',
            },
            opponent:{
                displayName:'Opponent',
            }
        });
        await expect(service.getWager('user-id','wager-id')).resolves.toMatchObject({
            id:'wager-id',
            creatorId:'user-id',
            opponentId:'opponent-id',
            isCreator:true
        });
    });
    it('returns not found when a wager does not exist',async()=>{
        prisma.wager.findUnique.mockResolvedValue(null);
        await expect(service.getWager('user-id','missing-id')).rejects.toBeInstanceOf(NotFoundException);
    });
    it('forbids a user who is not a wager participant',async()=>{
        prisma.wager.findUnique.mockResolvedValue({
            id:'wager-id',
            creatorId:'creator-id',
            opponentId:'opponent-id',
            taskType:WagerTaskType.ALL_PAYMENTS_ON_TIME,
            stakeAmount:50,
            status:WagerStatus.PENDING,
            durationDays:7,
            invitedAt:new Date(),
            respondedAt:null,
            startDate:null,
            endDate:null,
            resolvedAt:null,
            creatorOutcome:null,
            opponentOutcome:null,
            creator:{
                displayName:'Creator',
            },
            opponent:{
                displayName:'Opponent',
            }
        });
        await expect(service.getWager('stranger-id','wager-id')).rejects.toBeInstanceOf(ForbiddenException);
    });
});