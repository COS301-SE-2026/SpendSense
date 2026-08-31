import { SchedulerService } from './scheduler.service';
import type { RemindersService } from '../reminders/reminders.service';
import type { PaymentOccurrencesService } from '../payment-occurrences/payment-occurrences.service';
import type { PrismaService } from '../prisma/prisma.service';
import {
  NotificationType,
  PaymentOccurrenceStatus,
  PaymentRecordStatus,
  WagerOutcome,
  WagerStatus,
  WagerTaskType,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RewardService } from '../rewards/reward.service';

describe('SchedulerService', () => {
  let remindersService: jest.Mocked<
    Pick<RemindersService, 'processDueReminders'>
  >;
  let service: SchedulerService;
  let paymentOccurrencesService: jest.Mocked<
    Pick<
      PaymentOccurrencesService,
      'transitionOverdueOccurrences' | 'transitionMissedOccurrence'
    >
  >;

  const prisma = {
    $transaction: jest.fn(),

    wager: {
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },

    gamificationProfile: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const rewardService = {
    grantCoins: jest.fn(),
    adjustCoins: jest.fn(),
  };
  const notificationsService = {
    create: jest.fn(),
  };
  const createActiveWager = (overrides: Record<string, unknown> = {}) => ({
    id: 'wager-id',
    creatorId: 'creator-id',
    opponentId: 'opponent-id',
    taskType: WagerTaskType.ALL_PAYMENTS_ON_TIME,
    stakeAmount: 50,
    status: WagerStatus.ACTIVE,
    startDate: new Date('2026-08-01T00:00:00.000Z'),
    endDate: new Date('2026-08-08T00:00:00.000Z'),
    taskSnapshot: null,
    creator: {
      displayName: 'Creator',
      deletedAt: null,
    },
    opponent: {
      displayName: 'Opponent',
      deletedAt: null,
    },
    ...overrides,
  });
  const createSettlementClient = (
    wagerOverrides: Record<string, unknown> = {},
    claimCount = 1,
  ) => ({
    wager: {
      findUnique: jest
        .fn()
        .mockResolvedValue(createActiveWager(wagerOverrides)),
      updateMany: jest.fn().mockResolvedValue({ count: claimCount }),
      update: jest.fn().mockResolvedValue({}),
    },
    paymentOccurrence: {
      findMany: jest.fn(),
    },
    gamificationProfile: {
      findUnique: jest.fn(),
    },
  });
  const useTransactionClient = <T>(transactionClient: T) => {
    prisma.$transaction.mockImplementationOnce((operation: unknown) => {
      const callback = operation as (tx: T) => Promise<unknown>;
      return callback(transactionClient);
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    remindersService = {
      processDueReminders: jest.fn(),
    };

    paymentOccurrencesService = {
      transitionOverdueOccurrences: jest.fn(),
      transitionMissedOccurrence: jest.fn(),
    };

    remindersService.processDueReminders.mockResolvedValue({
      processedCount: 0,
    });

    paymentOccurrencesService.transitionOverdueOccurrences.mockResolvedValue({
      transitionedCount: 0,
    });

    paymentOccurrencesService.transitionMissedOccurrence.mockResolvedValue({
      transitionedCount: 0,
    });

    prisma.wager.updateMany.mockResolvedValue({ count: 0 });
    prisma.wager.findMany.mockResolvedValue([]);

    prisma.gamificationProfile.findMany.mockResolvedValue([]);
    prisma.gamificationProfile.updateMany.mockResolvedValue({
      count: 0,
    });

    service = new SchedulerService(
      remindersService as unknown as RemindersService,
      paymentOccurrencesService as unknown as PaymentOccurrencesService,
      prisma as unknown as PrismaService,
      rewardService as unknown as RewardService,
      notificationsService as unknown as NotificationsService,
    );
  });

  describe('runScheduledJob', () => {
    it('will not throw when no reminders due to be processed', async () => {
      await expect(service.runScheduledJob()).resolves.not.toThrow();
    });

    it('will call runAll when scheduled job runs', async () => {
      paymentOccurrencesService.transitionOverdueOccurrences.mockResolvedValue({
        transitionedCount: 2,
      });
      paymentOccurrencesService.transitionMissedOccurrence.mockResolvedValue({
        transitionedCount: 1,
      });
      remindersService.processDueReminders.mockResolvedValue({
        processedCount: 3,
      });

      await service.runScheduledJob();

      expect(
        paymentOccurrencesService.transitionOverdueOccurrences,
      ).toHaveBeenCalledWith();
      expect(
        paymentOccurrencesService.transitionMissedOccurrence,
      ).toHaveBeenCalledWith();
      expect(remindersService.processDueReminders).toHaveBeenCalledWith();
    });
  });

  describe('runAll', () => {
    it('run all scheduled methods and combine the counts', async () => {
      paymentOccurrencesService.transitionOverdueOccurrences.mockResolvedValue({
        transitionedCount: 2,
      });
      paymentOccurrencesService.transitionMissedOccurrence.mockResolvedValue({
        transitionedCount: 1,
      });
      remindersService.processDueReminders.mockResolvedValue({
        processedCount: 3,
      });

      const rslt = await service.runAll();

      expect(
        paymentOccurrencesService.transitionOverdueOccurrences,
      ).toHaveBeenCalledWith();
      expect(
        paymentOccurrencesService.transitionMissedOccurrence,
      ).toHaveBeenCalledWith();
      expect(remindersService.processDueReminders).toHaveBeenCalledWith();

      expect(rslt).toEqual({
        overdueTransitionedCount: 2,
        missedTransitionedCount: 1,
        processedCount: 3,
        mascotMoodsDecayedCount: 0,
        expiredWagerCount: 0,
        resolvedWagerCount: 0,
      });
    });

    it('returns all the 0 counts when there is not anything to process', async () => {
      const rslt = await service.runAll();

      expect(rslt).toEqual({
        overdueTransitionedCount: 0,
        missedTransitionedCount: 0,
        processedCount: 0,
        mascotMoodsDecayedCount: 0,
        expiredWagerCount: 0,
        resolvedWagerCount: 0,
      });
    });
    it('expires pending wagers after 48 hours without moving coins', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-08-23T12:00:00.000Z'));
      prisma.wager.updateMany.mockResolvedValue({ count: 2 });
      const rslt = await service.runAll();
      expect(prisma.wager.updateMany).toHaveBeenCalledWith({
        where: {
          status: WagerStatus.PENDING,
          invitedAt: {
            lte: new Date('2026-08-21T12:00:00.000Z'),
          },
        },
        data: {
          status: WagerStatus.EXPIRED,
        },
      });
      expect(rslt.expiredWagerCount).toBe(2);
      expect(rewardService.grantCoins).not.toHaveBeenCalled();
      expect(rewardService.adjustCoins).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
    it('resolves an all payments on time wager with one winner', async () => {
      const transactionClient = createSettlementClient();
      transactionClient.paymentOccurrence.findMany
        .mockResolvedValueOnce([
          {
            status: PaymentOccurrenceStatus.PAID,
            payment: {
              paymentStatus: PaymentRecordStatus.ON_TIME,
              deletedAt: null,
            },
          },
        ])
        .mockResolvedValueOnce([
          {
            status: PaymentOccurrenceStatus.PAID_LATE,
            payment: {
              paymentStatus: PaymentRecordStatus.LATE,
              deletedAt: null,
            },
          },
        ]);
      prisma.wager.findMany.mockResolvedValue([{ id: 'wager-id' }]);
      useTransactionClient(transactionClient);
      rewardService.grantCoins.mockResolvedValue({ coinBalance: 200 });
      notificationsService.create.mockResolvedValue(undefined);
      const rslt = await service.runAll();
      expect(rewardService.grantCoins).toHaveBeenCalledWith(transactionClient, {
        userId: 'creator-id',
        amount: 100,
        reason: 'Wager won vs Opponent',
      });
      expect(rewardService.adjustCoins).not.toHaveBeenCalled();
      expect(transactionClient.wager.update).toHaveBeenCalledWith({
        where: {
          id: 'wager-id',
        },
        data: {
          creatorOutcome: WagerOutcome.WON,
          opponentOutcome: WagerOutcome.LOST,
        },
      });
      expect(notificationsService.create).toHaveBeenCalledTimes(2);
      expect(notificationsService.create).toHaveBeenNthCalledWith(
        1,
        {
          userId: 'creator-id',
          type: NotificationType.WAGER_RESULT,
          title: 'Wager result',
          message: 'You won your wager.',
          sourceId: 'wager-id',
        },
        transactionClient,
      );
      expect(notificationsService.create).toHaveBeenNthCalledWith(
        2,
        {
          userId: 'opponent-id',
          type: NotificationType.WAGER_RESULT,
          title: 'Wager result',
          message: 'You lost your wager.',
          sourceId: 'wager-id',
        },
        transactionClient,
      );
      expect(rslt.resolvedWagerCount).toBe(1);
    });
    it('allows late payments for no missed payments and draws when both succeed', async () => {
      const transactionClient = createSettlementClient({
        taskType: WagerTaskType.NO_MISSED_PAYMENTS,
      });
      transactionClient.paymentOccurrence.findMany
        .mockResolvedValueOnce([
          {
            status: PaymentOccurrenceStatus.PAID_LATE,
            payment: null,
          },
        ])
        .mockResolvedValueOnce([
          {
            status: PaymentOccurrenceStatus.PAID,
            payment: null,
          },
        ]);
      prisma.wager.findMany.mockResolvedValue([{ id: 'wager-id' }]);
      useTransactionClient(transactionClient);
      rewardService.adjustCoins.mockResolvedValue({ coinBalance: 100 });
      notificationsService.create.mockResolvedValue(undefined);
      const rslt = await service.runAll();
      expect(rewardService.adjustCoins).toHaveBeenNthCalledWith(
        1,
        transactionClient,
        {
          userId: 'creator-id',
          amount: 50,
          reason: 'Wager draw - stake returned',
        },
      );
      expect(rewardService.adjustCoins).toHaveBeenNthCalledWith(
        2,
        transactionClient,
        {
          userId: 'opponent-id',
          amount: 50,
          reason: 'Wager draw - stake returned',
        },
      );
      expect(rewardService.grantCoins).not.toHaveBeenCalled();
      expect(transactionClient.wager.update).toHaveBeenCalledWith({
        where: {
          id: 'wager-id',
        },
        data: {
          creatorOutcome: WagerOutcome.DRAW,
          opponentOutcome: WagerOutcome.DRAW,
        },
      });
      expect(rslt.resolvedWagerCount).toBe(1);
    });
    it('draws when both participants fail a maintain payment streak wager', async () => {
      const transactionClient = createSettlementClient({
        taskType: WagerTaskType.MAINTAIN_PAYMENT_STREAK,
        stakeAmount: 25,
        taskSnapshot: {
          creatorCurrentPaymentStreak: 4,
          opponentCurrentPaymentStreak: 7,
        },
      });
      transactionClient.gamificationProfile.findUnique
        .mockResolvedValueOnce({
          currentPaymentStreak: 3,
        })
        .mockResolvedValueOnce({
          currentPaymentStreak: 6,
        });
      prisma.wager.findMany.mockResolvedValue([{ id: 'wager-id' }]);
      useTransactionClient(transactionClient);
      rewardService.adjustCoins.mockResolvedValue({ coinBalance: 100 });
      notificationsService.create.mockResolvedValue(undefined);
      const rslt = await service.runAll();
      expect(rewardService.adjustCoins).toHaveBeenCalledTimes(2);
      expect(rewardService.grantCoins).not.toHaveBeenCalled();
      expect(transactionClient.wager.update).toHaveBeenCalledWith({
        where: {
          id: 'wager-id',
        },
        data: {
          creatorOutcome: WagerOutcome.DRAW,
          opponentOutcome: WagerOutcome.DRAW,
        },
      });
      expect(rslt.resolvedWagerCount).toBe(1);
    });
    it('treats a deactivated participant as losing the wager', async () => {
      const transactionClient = createSettlementClient({
        creator: {
          displayName: 'Creator',
          deletedAt: new Date('2026-08-05T00:00:00.000Z'),
        },
      });
      prisma.wager.findMany.mockResolvedValue([{ id: 'wager-id' }]);
      useTransactionClient(transactionClient);
      rewardService.grantCoins.mockResolvedValue({ coinBalance: 200 });
      notificationsService.create.mockResolvedValue(undefined);
      await service.runAll();
      expect(rewardService.grantCoins).toHaveBeenCalledWith(transactionClient, {
        userId: 'opponent-id',
        amount: 100,
        reason: 'Wager won vs Creator',
      });
      expect(transactionClient.wager.update).toHaveBeenCalledWith({
        where: {
          id: 'wager-id',
        },
        data: {
          creatorOutcome: WagerOutcome.LOST,
          opponentOutcome: WagerOutcome.WON,
        },
      });
    });
    it('does not pay a wager another scheduler run already claimed', async () => {
      const transactionClient = createSettlementClient({}, 0);
      prisma.wager.findMany.mockResolvedValue([{ id: 'wager-id' }]);
      useTransactionClient(transactionClient);
      const rslt = await service.runAll();
      expect(rslt.resolvedWagerCount).toBe(0);
      expect(rewardService.grantCoins).not.toHaveBeenCalled();
      expect(rewardService.adjustCoins).not.toHaveBeenCalled();
      expect(notificationsService.create).not.toHaveBeenCalled();
      expect(transactionClient.wager.update).not.toHaveBeenCalled();
    });
    it('retries settlement after a failed reward transaction', async () => {
      const transactionClient = createSettlementClient();
      transactionClient.paymentOccurrence.findMany
        .mockResolvedValueOnce([
          {
            status: PaymentOccurrenceStatus.PAID,
            payment: {
              paymentStatus: PaymentRecordStatus.ON_TIME,
              deletedAt: null,
            },
          },
        ])
        .mockResolvedValueOnce([
          {
            status: PaymentOccurrenceStatus.PAID_LATE,
            payment: {
              paymentStatus: PaymentRecordStatus.LATE,
              deletedAt: null,
            },
          },
        ])
        .mockResolvedValueOnce([
          {
            status: PaymentOccurrenceStatus.PAID,
            payment: {
              paymentStatus: PaymentRecordStatus.ON_TIME,
              deletedAt: null,
            },
          },
        ])
        .mockResolvedValueOnce([
          {
            status: PaymentOccurrenceStatus.PAID_LATE,
            payment: {
              paymentStatus: PaymentRecordStatus.LATE,
              deletedAt: null,
            },
          },
        ]);
      prisma.wager.findMany.mockResolvedValue([{ id: 'wager-id' }]);
      prisma.$transaction.mockImplementation((operation: unknown) => {
        const callback = operation as (
          tx: typeof transactionClient,
        ) => Promise<unknown>;
        return callback(transactionClient);
      });
      rewardService.grantCoins
        .mockRejectedValueOnce(new Error('Temporary reward failure'))
        .mockResolvedValueOnce({ coinBalance: 200 });
      notificationsService.create.mockResolvedValue(undefined);
      await expect(service.runAll()).rejects.toThrow(
        'Temporary reward failure',
      );
      const rslt = await service.runAll();
      expect(rewardService.grantCoins).toHaveBeenCalledTimes(2);
      expect(rslt.resolvedWagerCount).toBe(1);
      expect(notificationsService.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('decayMascotMoods', () => {
    const now = new Date('2026-08-30T12:00:00.000Z');

    it('will leave moods alone when they are not old enough to decay yet', async () => {
      prisma.gamificationProfile.findMany.mockResolvedValue([]);

      const result = await service.decayMascotMoods(now);

      expect(prisma.gamificationProfile.updateMany).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('will not decay the same mood again at a later time', async () => {
      const updatedAt = new Date('2026-08-29T12:00:00.000Z');

      prisma.gamificationProfile.findMany
        .mockResolvedValueOnce([
          {
            id: 'profile-1',
            mascotMood: 'CELEBRATING',
            mascotMoodUpdatedAt: updatedAt,
          },
        ])
        .mockResolvedValueOnce([]);

      prisma.gamificationProfile.updateMany.mockResolvedValue({
        count: 1,
      });

      const firstResult = await service.decayMascotMoods(now);
      const secondResult = await service.decayMascotMoods(
        new Date('2026-08-30T12:01:00.000Z'),
      );

      expect(firstResult).toBe(1);
      expect(secondResult).toBe(0);

      expect(prisma.gamificationProfile.updateMany).toHaveBeenCalledTimes(1);
    });

    it('will decay HAPPY STRESSED and SAD after 72 hours', async () => {
      const updatedAt = new Date('2026-08-27T12:00:00.000Z');

      prisma.gamificationProfile.findMany.mockResolvedValue([
        {
          id: 'profile-happy',
          mascotMood: 'HAPPY',
          mascotMoodUpdatedAt: updatedAt,
        },
        {
          id: 'profile-stressed',
          mascotMood: 'STRESSED',
          mascotMoodUpdatedAt: updatedAt,
        },
        {
          id: 'profile-sad',
          mascotMood: 'SAD',
          mascotMoodUpdatedAt: updatedAt,
        },
      ]);

      prisma.gamificationProfile.updateMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.decayMascotMoods(now);

      expect(prisma.gamificationProfile.updateMany).toHaveBeenCalledTimes(3);

      expect(result).toBe(3);
    });

    it('will decay CELEBRATING after 24 hours', async () => {
      const updatedAt = new Date('2026-08-29T12:00:00.000Z');

      prisma.gamificationProfile.findMany.mockResolvedValue([
        {
          id: 'profile-1',
          mascotMood: 'CELEBRATING',
          mascotMoodUpdatedAt: updatedAt,
        },
      ]);

      prisma.gamificationProfile.updateMany.mockResolvedValue({
        count: 1,
      });

      const result = await service.decayMascotMoods(now);

      expect(prisma.gamificationProfile.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              mascotMood: 'CELEBRATING',
              mascotMoodUpdatedAt: {
                lte: new Date('2026-08-29T12:00:00.000Z'),
              },
            },
            {
              mascotMood: {
                in: ['HAPPY', 'SAD', 'STRESSED'],
              },
              mascotMoodUpdatedAt: {
                lte: new Date('2026-08-27T12:00:00.000Z'),
              },
            },
          ],
        },
        select: {
          id: true,
          mascotMood: true,
          mascotMoodUpdatedAt: true,
        },
      });

      expect(prisma.gamificationProfile.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'profile-1',
          mascotMood: 'CELEBRATING',
          mascotMoodUpdatedAt: updatedAt,
        },
        data: {
          mascotMood: 'NEUTRAL',
          mascotMoodUpdatedAt: now,
        },
      });

      expect(result).toBe(1);
    });

    it('will not overwrite a new mascot reaction with an old decay', async () => {
      const oldUpdatedAt = new Date('2026-08-27T12:00:00.000Z');

      prisma.gamificationProfile.findMany.mockResolvedValue([
        {
          id: 'profile-1',
          mascotMood: 'SAD',
          mascotMoodUpdatedAt: oldUpdatedAt,
        },
      ]);

      prisma.gamificationProfile.updateMany.mockResolvedValue({
        count: 0,
      });

      const result = await service.decayMascotMoods(now);

      expect(prisma.gamificationProfile.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'profile-1',
          mascotMood: 'SAD',
          mascotMoodUpdatedAt: oldUpdatedAt,
        },
        data: {
          mascotMood: 'NEUTRAL',
          mascotMoodUpdatedAt: now,
        },
      });

      expect(result).toBe(0);
    });
  });
});
