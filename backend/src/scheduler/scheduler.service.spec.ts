import { SchedulerService } from './scheduler.service';
import type { RemindersService } from '../reminders/reminders.service';
import type { PaymentOccurrencesService } from '../payment-occurrences/payment-occurrences.service';
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
    remindersService = {
      processDueReminders: jest.fn(),
    };

    paymentOccurrencesService = {
      transitionOverdueOccurrences: jest.fn(),
      transitionMissedOccurrence: jest.fn(),
    };

    jest.clearAllMocks();
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
    it('run all three methods and then combine the counts', async () => {
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
});
