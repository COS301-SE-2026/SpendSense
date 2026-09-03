import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, WagerStatus, WagerTaskType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  InsufficientCoinsException,
  RewardService,
} from '../rewards/reward.service';
import { WagersService } from './wagers.service';
describe('WagersService', () => {
  const prisma = {
    $transaction: jest.fn(),
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    friendship: {
      findUnique: jest.fn(),
    },
    wager: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const notificationsService = { create: jest.fn() };
  const rewardService = { spendCoins: jest.fn() };
  const createPendingWager = (overrides: Record<string, unknown> = {}) => ({
    id: 'wager-id',
    creatorId: 'creator-id',
    opponentId: 'opponent-id',
    taskType: WagerTaskType.ALL_PAYMENTS_ON_TIME,
    stakeAmount: 50,
    status: WagerStatus.PENDING,
    durationDays: 7,
    opponent: {
      displayName: 'Opponent',
    },
    ...overrides,
  });
  const createWagerTransactionClient = (
    wagerOverrides: Record<string, unknown> = {},
    updateCount = 1,
  ) => ({
    wager: {
      findUnique: jest
        .fn()
        .mockResolvedValue(createPendingWager(wagerOverrides)),
      updateMany: jest.fn().mockResolvedValue({ count: updateCount }),
    },
    gamificationProfile: {
      findMany: jest.fn(),
    },
  });
  const useTransactionClient = <T>(transactionClient: T) => {
    prisma.$transaction.mockImplementationOnce((operation: unknown) => {
      const callback = operation as (tx: T) => Promise<unknown>;
      return callback(transactionClient);
    });
  };
  const service = new WagersService(
    prisma as unknown as PrismaService,
    notificationsService as unknown as NotificationsService,
    rewardService as unknown as RewardService,
  );
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('creates a pending wager against a current friend', async () => {
    const invitedAt = new Date('2026-08-23T10:00:00.000Z');
    prisma.user.findFirst.mockResolvedValue({
      id: 'opponent-id',
    });
    prisma.$transaction
      .mockResolvedValueOnce([
        { id: 'friendship-id' },
        {
          id: 'creator-id',
          displayName: 'Creator',
          gamificationProfile: {
            coinBalance: 100,
          },
        },
      ])
      .mockImplementationOnce((operation: unknown) => {
        const tx = {
          wager: {
            create: jest.fn().mockResolvedValue({
              id: 'wager-id',
              creatorId: 'creator-id',
              opponentId: 'opponent-id',
              taskType: WagerTaskType.ALL_PAYMENTS_ON_TIME,
              stakeAmount: 50,
              status: WagerStatus.PENDING,
              durationDays: 7,
              invitedAt,
              respondedAt: null,
              startDate: null,
              endDate: null,
              resolvedAt: null,
              creatorOutcome: null,
              opponentOutcome: null,
              creator: {
                displayName: 'Creator',
              },
              opponent: {
                displayName: 'Opponent',
              },
            }),
          },
        };
        const callback = operation as (tx: typeof tx) => Promise<unknown>;
        return callback(tx);
      });
    notificationsService.create.mockResolvedValue(undefined);
    await expect(
      service.createWager('creator-id', {
        opponentId: 'opponent-id',
        taskType: WagerTaskType.ALL_PAYMENTS_ON_TIME,
        stakeAmount: 50,
        durationDays: 7,
      }),
    ).resolves.toEqual({
      id: 'wager-id',
      creatorId: 'creator-id',
      opponentId: 'opponent-id',
      taskType: WagerTaskType.ALL_PAYMENTS_ON_TIME,
      stakeAmount: 50,
      status: WagerStatus.PENDING,
      durationDays: 7,
      invitedAt,
      startDate: null,
      endDate: null,
      resolvedAt: null,
      creatorOutcome: null,
      opponentOutcome: null,
      isCreator: true,
    });
  });
  it('creates a wager invite notification for the opponent', async () => {
    const transactionClient = {
      wager: {
        create: jest.fn().mockResolvedValue({
          id: 'wager-id',
          creatorId: 'creator-id',
          opponentId: 'opponent-id',
          taskType: WagerTaskType.NO_MISSED_PAYMENTS,
          stakeAmount: 25,
          status: WagerStatus.PENDING,
          durationDays: 7,
          invitedAt: new Date(),
          respondedAt: null,
          startDate: null,
          endDate: null,
          resolvedAt: null,
          creatorOutcome: null,
          opponentOutcome: null,
          creator: {
            displayName: 'Creator',
          },
          opponent: {
            displayName: 'Opponent',
          },
        }),
      },
    };
    prisma.user.findFirst.mockResolvedValue({
      id: 'opponent-id',
    });
    prisma.$transaction
      .mockResolvedValueOnce([
        { id: 'friendship-id' },
        {
          id: 'creator-id',
          displayName: 'Creator',
          gamificationProfile: {
            coinBalance: 100,
          },
        },
      ])
      .mockImplementationOnce((operation: unknown) => {
        const callback = operation as (
          tx: typeof transactionClient,
        ) => Promise<unknown>;
        return callback(transactionClient);
      });
    notificationsService.create.mockResolvedValue(undefined);
    await service.createWager('creator-id', {
      opponentId: 'opponent-id',
      taskType: WagerTaskType.NO_MISSED_PAYMENTS,
      stakeAmount: 25,
      durationDays: 7,
    });
    expect(notificationsService.create).toHaveBeenCalledWith(
      {
        userId: 'opponent-id',
        type: NotificationType.WAGER_INVITE,
        title: 'New wager invite',
        message: 'Creator invited you to a wager.',
        sourceId: 'wager-id',
      },
      transactionClient,
    );
  });
  it('rejects creating a wager against yourself', async () => {
    await expect(
      service.createWager('user-id', {
        opponentId: 'user-id',
        taskType: WagerTaskType.ALL_PAYMENTS_ON_TIME,
        stakeAmount: 50,
        durationDays: 7,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
  it('returns not found when the opponent does not exist', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(
      service.createWager('creator-id', {
        opponentId: 'missing-id',
        taskType: WagerTaskType.ALL_PAYMENTS_ON_TIME,
        stakeAmount: 50,
        durationDays: 7,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('rejects creating a wager against a non-friend', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'opponent-id',
    });
    prisma.$transaction.mockResolvedValueOnce([
      null,
      {
        id: 'creator-id',
        displayName: 'Creator',
        gamificationProfile: {
          coinBalance: 100,
        },
      },
    ]);
    await expect(
      service.createWager('creator-id', {
        opponentId: 'opponent-id',
        taskType: WagerTaskType.ALL_PAYMENTS_ON_TIME,
        stakeAmount: 50,
        durationDays: 7,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects a wager when the creator has insufficient coins', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'opponent-id',
    });
    prisma.$transaction.mockResolvedValueOnce([
      { id: 'friendship-id' },
      {
        id: 'creator-id',
        displayName: 'Creator',
        gamificationProfile: {
          coinBalance: 25,
        },
      },
    ]);
    await expect(
      service.createWager('creator-id', {
        opponentId: 'opponent-id',
        taskType: WagerTaskType.ALL_PAYMENTS_ON_TIME,
        stakeAmount: 50,
        durationDays: 7,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('returns not found when the creator profile does not exist', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'opponent-id',
    });
    prisma.$transaction.mockResolvedValueOnce([{ id: 'friendship-id' }, null]);
    await expect(
      service.createWager('creator-id', {
        opponentId: 'opponent-id',
        taskType: WagerTaskType.ALL_PAYMENTS_ON_TIME,
        stakeAmount: 50,
        durationDays: 7,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('lists wagers where the user is either creator or opponent', async () => {
    prisma.wager.findMany.mockResolvedValue([]);
    await service.listWagers('user-id');
    expect(prisma.wager.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ creatorId: 'user-id' }, { opponentId: 'user-id' }],
        },
        orderBy: {
          invitedAt: 'desc',
        },
      }),
    );
  });
  it('filters wagers by status when a status is provided', async () => {
    prisma.wager.findMany.mockResolvedValue([]);
    await service.listWagers('user-id', WagerStatus.ACTIVE);
    expect(prisma.wager.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ creatorId: 'user-id' }, { opponentId: 'user-id' }],
          status: WagerStatus.ACTIVE,
        },
        orderBy: {
          invitedAt: 'desc',
        },
      }),
    );
  });
  it('returns wager summaries with isCreator calculated for the caller', async () => {
    const invitedAt = new Date('2026-08-23T10:00:00.000Z');
    prisma.wager.findMany.mockResolvedValue([
      {
        id: 'wager-id',
        creatorId: 'creator-id',
        opponentId: 'user-id',
        taskType: WagerTaskType.MAINTAIN_PAYMENT_STREAK,
        stakeAmount: 50,
        status: WagerStatus.ACTIVE,
        durationDays: 7,
        invitedAt,
        respondedAt: new Date('2026-08-23T11:00:00.000Z'),
        startDate: new Date('2026-08-23T11:00:00.000Z'),
        endDate: new Date('2026-08-30T11:00:00.000Z'),
        resolvedAt: null,
        creatorOutcome: null,
        opponentOutcome: null,
        creator: {
          displayName: 'Creator',
        },
        opponent: {
          displayName: 'Opponent',
        },
      },
    ]);
    await expect(service.listWagers('user-id')).resolves.toMatchObject([
      {
        id: 'wager-id',
        creatorId: 'creator-id',
        opponentId: 'user-id',
        isCreator: false,
      },
    ]);
  });
  it('returns a wager when the caller is a participant', async () => {
    prisma.wager.findUnique.mockResolvedValue({
      id: 'wager-id',
      creatorId: 'user-id',
      opponentId: 'opponent-id',
      taskType: WagerTaskType.ALL_PAYMENTS_ON_TIME,
      stakeAmount: 50,
      status: WagerStatus.PENDING,
      durationDays: 7,
      invitedAt: new Date(),
      respondedAt: null,
      startDate: null,
      endDate: null,
      resolvedAt: null,
      creatorOutcome: null,
      opponentOutcome: null,
      creator: {
        displayName: 'Creator',
      },
      opponent: {
        displayName: 'Opponent',
      },
    });
    await expect(
      service.getWager('user-id', 'wager-id'),
    ).resolves.toMatchObject({
      id: 'wager-id',
      creatorId: 'user-id',
      opponentId: 'opponent-id',
      isCreator: true,
    });
  });
  it('returns not found when a wager does not exist', async () => {
    prisma.wager.findUnique.mockResolvedValue(null);
    await expect(
      service.getWager('user-id', 'missing-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it('forbids a user who is not a wager participant', async () => {
    prisma.wager.findUnique.mockResolvedValue({
      id: 'wager-id',
      creatorId: 'creator-id',
      opponentId: 'opponent-id',
      taskType: WagerTaskType.ALL_PAYMENTS_ON_TIME,
      stakeAmount: 50,
      status: WagerStatus.PENDING,
      durationDays: 7,
      invitedAt: new Date(),
      respondedAt: null,
      startDate: null,
      endDate: null,
      resolvedAt: null,
      creatorOutcome: null,
      opponentOutcome: null,
      creator: {
        displayName: 'Creator',
      },
      opponent: {
        displayName: 'Opponent',
      },
    });
    await expect(
      service.getWager('stranger-id', 'wager-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('accepts a pending wager and spends both stakes', async () => {
    const transactionClient = createWagerTransactionClient();
    useTransactionClient(transactionClient);
    rewardService.spendCoins
      .mockResolvedValueOnce({
        coinBalance: 100,
      })
      .mockResolvedValueOnce({
        coinBalance: 75,
      });
    const result = await service.acceptWager('opponent-id', 'wager-id');
    expect(rewardService.spendCoins).toHaveBeenNthCalledWith(
      1,
      transactionClient,
      {
        userId: 'creator-id',
        amount: 50,
        reason: 'Wager stake',
      },
    );
    expect(rewardService.spendCoins).toHaveBeenNthCalledWith(
      2,
      transactionClient,
      {
        userId: 'opponent-id',
        amount: 50,
        reason: 'Wager stake',
      },
    );
    expect(transactionClient.wager.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'wager-id',
        opponentId: 'opponent-id',
        status: WagerStatus.PENDING,
      },
      data: {
        status: WagerStatus.ACTIVE,
        respondedAt: expect.any(Date) as Date,
        startDate: expect.any(Date) as Date,
        endDate: expect.any(Date) as Date,
      },
    });
    expect(notificationsService.create).toHaveBeenCalledWith(
      {
        userId: 'creator-id',
        type: NotificationType.SYSTEM,
        title: 'Wager started',
        message: 'Opponent accepted your wager. The challenge has started.',
        sourceId: 'wager-id',
      },
      transactionClient,
    );
    expect(result).toMatchObject({
      id: 'wager-id',
      status: WagerStatus.ACTIVE,
      coinBalance: 75,
    });
    expect(result.endDate.getTime() - result.startDate.getTime()).toBe(
      7 * 24 * 60 * 60 * 1000,
    );
  });
  it('snapshots both payment streaks when accepting a streak wager', async () => {
    const transactionClient = createWagerTransactionClient({
      taskType: WagerTaskType.MAINTAIN_PAYMENT_STREAK,
      stakeAmount: 25,
    });
    transactionClient.gamificationProfile.findMany.mockResolvedValue([
      {
        userId: 'creator-id',
        currentPaymentStreak: 4,
      },
      {
        userId: 'opponent-id',
        currentPaymentStreak: 7,
      },
    ]);
    useTransactionClient(transactionClient);
    rewardService.spendCoins
      .mockResolvedValueOnce({
        coinBalance: 75,
      })
      .mockResolvedValueOnce({
        coinBalance: 50,
      });
    await service.acceptWager('opponent-id', 'wager-id');
    expect(transactionClient.gamificationProfile.findMany).toHaveBeenCalledWith(
      {
        where: {
          userId: {
            in: ['creator-id', 'opponent-id'],
          },
        },
        select: {
          userId: true,
          currentPaymentStreak: true,
        },
      },
    );
    expect(transactionClient.wager.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'wager-id',
        opponentId: 'opponent-id',
        status: WagerStatus.PENDING,
      },
      data: {
        status: WagerStatus.ACTIVE,
        respondedAt: expect.any(Date) as Date,
        startDate: expect.any(Date) as Date,
        endDate: expect.any(Date) as Date,
        taskSnapshot: {
          creatorCurrentPaymentStreak: 4,
          opponentCurrentPaymentStreak: 7,
        },
      },
    });
  });
  it('forbids the creator from accepting their own wager', async () => {
    const transactionClient = createWagerTransactionClient();
    useTransactionClient(transactionClient);
    await expect(
      service.acceptWager('creator-id', 'wager-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(rewardService.spendCoins).not.toHaveBeenCalled();
  });
  it('rejects acceptance when the wager is not pending', async () => {
    const transactionClient = createWagerTransactionClient({
      status: WagerStatus.ACTIVE,
    });
    useTransactionClient(transactionClient);
    await expect(
      service.acceptWager('opponent-id', 'wager-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(rewardService.spendCoins).not.toHaveBeenCalled();
  });
  it('rejects a concurrent second acceptance before spending coins', async () => {
    const transactionClient = createWagerTransactionClient({}, 0);
    useTransactionClient(transactionClient);
    await expect(
      service.acceptWager('opponent-id', 'wager-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(rewardService.spendCoins).not.toHaveBeenCalled();
  });
  it('rejects acceptance when a participant has insufficient coins', async () => {
    const transactionClient = createWagerTransactionClient();
    useTransactionClient(transactionClient);
    rewardService.spendCoins
      .mockResolvedValueOnce({
        coinBalance: 50,
      })
      .mockRejectedValueOnce(new InsufficientCoinsException('opponent-id', 50));
    await expect(
      service.acceptWager('opponent-id', 'wager-id'),
    ).rejects.toBeInstanceOf(InsufficientCoinsException);
    expect(rewardService.spendCoins).toHaveBeenCalledTimes(2);
  });
  it('allows the opponent to decline a pending wager without moving coins', async () => {
    const transactionClient = createWagerTransactionClient();
    useTransactionClient(transactionClient);
    await expect(
      service.declineWager('opponent-id', 'wager-id'),
    ).resolves.toEqual({
      id: 'wager-id',
      status: WagerStatus.DECLINED,
    });
    expect(transactionClient.wager.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'wager-id',
        opponentId: 'opponent-id',
        status: WagerStatus.PENDING,
      },
      data: {
        status: WagerStatus.DECLINED,
        respondedAt: expect.any(Date) as Date,
      },
    });
    expect(rewardService.spendCoins).not.toHaveBeenCalled();
  });
  it('forbids anyone except the opponent from declining a wager', async () => {
    const transactionClient = createWagerTransactionClient();
    useTransactionClient(transactionClient);
    await expect(
      service.declineWager('creator-id', 'wager-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(rewardService.spendCoins).not.toHaveBeenCalled();
  });
  it('rejects declining a wager that is no longer pending', async () => {
    const transactionClient = createWagerTransactionClient({
      status: WagerStatus.ACTIVE,
    });
    useTransactionClient(transactionClient);
    await expect(
      service.declineWager('opponent-id', 'wager-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(rewardService.spendCoins).not.toHaveBeenCalled();
  });
  it('allows the creator to cancel a pending wager without moving coins', async () => {
    const transactionClient = createWagerTransactionClient();
    useTransactionClient(transactionClient);
    await expect(
      service.cancelWager('creator-id', 'wager-id'),
    ).resolves.toEqual({
      id: 'wager-id',
      status: WagerStatus.CANCELLED,
    });
    expect(transactionClient.wager.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'wager-id',
        creatorId: 'creator-id',
        status: WagerStatus.PENDING,
      },
      data: {
        status: WagerStatus.CANCELLED,
      },
    });
    expect(rewardService.spendCoins).not.toHaveBeenCalled();
  });
  it('forbids anyone except the creator from cancelling a wager', async () => {
    const transactionClient = createWagerTransactionClient();
    useTransactionClient(transactionClient);
    await expect(
      service.cancelWager('opponent-id', 'wager-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(rewardService.spendCoins).not.toHaveBeenCalled();
  });
  it('rejects cancelling a wager that is no longer pending', async () => {
    const transactionClient = createWagerTransactionClient({
      status: WagerStatus.ACTIVE,
    });
    useTransactionClient(transactionClient);
    await expect(
      service.cancelWager('creator-id', 'wager-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(rewardService.spendCoins).not.toHaveBeenCalled();
  });
});
