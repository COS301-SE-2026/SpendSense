import { BadRequestException } from '@nestjs/common';
import {
  MascotMood,
  NotificationType,
  RewardTransactionType,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { InsufficientCoinsException, RewardService } from './reward.service';

// to run the tests in this file by itself: npm test -- reward.service.spec.ts
type PrismaMockMethod = jest.Mock<Promise<unknown>, [unknown]>;

type RewardPrismaMock = {
  gamificationProfile: {
    upsert: PrismaMockMethod;
    update: PrismaMockMethod;
    updateMany: PrismaMockMethod;
    findUniqueOrThrow: PrismaMockMethod;
  };
  rewardTransaction: {
    create: PrismaMockMethod;
    groupBy: PrismaMockMethod;
  };
  userEvent: {
    findUnique: PrismaMockMethod;
    update: PrismaMockMethod;
  };
};

describe('RewardService', () => {
  let service: RewardService;
  let tx: RewardPrismaMock;
  let notificationsService: {
    create: jest.Mock<Promise<unknown>, [unknown, unknown?]>;
  };

  const userId = 'user-1';

  beforeEach(() => {
    notificationsService = {
      create: jest
        .fn<Promise<unknown>, [unknown, unknown?]>()
        .mockResolvedValue({
          id: 'notification-1',
        }),
    };
    service = new RewardService(
      notificationsService as unknown as NotificationsService,
    );
    tx = {
      gamificationProfile: {
        upsert: jest.fn<Promise<unknown>, [unknown]>(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
        updateMany: jest.fn<Promise<unknown>, [unknown]>(),
        findUniqueOrThrow: jest.fn<Promise<unknown>, [unknown]>(),
      },
      rewardTransaction: {
        create: jest.fn<Promise<unknown>, [unknown]>(),
        groupBy: jest.fn<Promise<unknown>, [unknown]>(),
      },
      userEvent: {
        findUnique: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValue({
            metadata: {},
          }),
        update: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockResolvedValue({}),
      },
    };
  });

  describe('grantCoins', () => {
    it('increments the balance and writes an EARNED transaction', async () => {
      tx.gamificationProfile.upsert.mockResolvedValue({ coinBalance: 115 });

      const result = await service.grantCoins(tx as never, {
        userId,
        amount: 15,
        reason: 'On-time payment reward',
        sourceEventId: 'event-1',
      });

      expect(tx.gamificationProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: { coinBalance: { increment: 15 } },
        create: { userId, coinBalance: 15 },
      });
      expect(tx.rewardTransaction.create).toHaveBeenCalledWith({
        data: {
          userId,
          sourceEventId: 'event-1',
          type: RewardTransactionType.EARNED,
          amount: 15,
          balanceAfter: 115,
          reason: 'On-time payment reward',
        },
      });
      expect(result).toEqual({ coinBalance: 115 });
    });

    it('rejects a non-positive amount without touching the database', async () => {
      await expect(
        service.grantCoins(tx as never, {
          userId,
          amount: 0,
          reason: 'invalid',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.gamificationProfile.upsert).not.toHaveBeenCalled();
    });
  });

  describe('spendCoins', () => {
    it('decrements the balance and writes a SPENT transaction when funds are sufficient', async () => {
      tx.gamificationProfile.updateMany.mockResolvedValue({ count: 1 });
      tx.gamificationProfile.findUniqueOrThrow.mockResolvedValue({
        coinBalance: 85,
      });

      const result = await service.spendCoins(tx as never, {
        userId,
        amount: 15,
        reason: 'Cosmetic purchase',
        sourceEventId: 'event-2',
      });

      expect(tx.gamificationProfile.updateMany).toHaveBeenCalledWith({
        where: { userId, coinBalance: { gte: 15 } },
        data: { coinBalance: { decrement: 15 } },
      });
      expect(tx.rewardTransaction.create).toHaveBeenCalledWith({
        data: {
          userId,
          sourceEventId: 'event-2',
          type: RewardTransactionType.SPENT,
          amount: -15,
          balanceAfter: 85,
          reason: 'Cosmetic purchase',
        },
      });
      expect(result).toEqual({ coinBalance: 85 });
    });

    it('throws InsufficientCoinsException and writes no ledger row when funds are insufficient', async () => {
      tx.gamificationProfile.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.spendCoins(tx as never, {
          userId,
          amount: 1000,
          reason: 'Cosmetic purchase',
        }),
      ).rejects.toBeInstanceOf(InsufficientCoinsException);
      expect(tx.gamificationProfile.findUniqueOrThrow).not.toHaveBeenCalled();
      expect(tx.rewardTransaction.create).not.toHaveBeenCalled();
    });

    it('rejects a non-positive amount without touching the database', async () => {
      await expect(
        service.spendCoins(tx as never, {
          userId,
          amount: -5,
          reason: 'invalid',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.gamificationProfile.updateMany).not.toHaveBeenCalled();
    });

    it('only decrements the requesting user’s balance, simulating a concurrent-spend race', async () => {
      // Simulates two spendCoins calls racing for the same user: the DB WHERE clause
      // (coinBalance >= amount), not application code, is what must reject the second one.
      let balance = 20;
      tx.gamificationProfile.updateMany.mockImplementation(
        ({
          where,
          data,
        }: {
          where: { coinBalance: { gte: number } };
          data: { coinBalance: { decrement: number } };
        }) => {
          if (balance >= where.coinBalance.gte) {
            balance -= data.coinBalance.decrement;
            return Promise.resolve({ count: 1 });
          }
          return Promise.resolve({ count: 0 });
        },
      );
      tx.gamificationProfile.findUniqueOrThrow.mockImplementation(() =>
        Promise.resolve({ coinBalance: balance }),
      );

      const first = await service.spendCoins(tx as never, {
        userId,
        amount: 15,
        reason: 'Wager stake',
      });
      expect(first).toEqual({ coinBalance: 5 });

      await expect(
        service.spendCoins(tx as never, {
          userId,
          amount: 15,
          reason: 'Wager stake',
        }),
      ).rejects.toBeInstanceOf(InsufficientCoinsException);
      expect(balance).toBe(5);
    });
  });

  describe('adjustCoins', () => {
    it('applies a positive adjustment and writes an ADJUSTED transaction', async () => {
      tx.gamificationProfile.upsert.mockResolvedValue({ coinBalance: 30 });

      const result = await service.adjustCoins(tx as never, {
        userId,
        amount: 10,
        reason: 'Wager draw refund',
      });

      expect(tx.gamificationProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: { coinBalance: { increment: 10 } },
        create: { userId, coinBalance: 10 },
      });
      expect(tx.rewardTransaction.create).toHaveBeenCalledWith({
        data: {
          userId,
          sourceEventId: null,
          type: RewardTransactionType.ADJUSTED,
          amount: 10,
          balanceAfter: 30,
          reason: 'Wager draw refund',
        },
      });
      expect(result).toEqual({ coinBalance: 30 });
    });

    it('applies a negative adjustment', async () => {
      tx.gamificationProfile.upsert.mockResolvedValue({ coinBalance: 5 });

      await service.adjustCoins(tx as never, {
        userId,
        amount: -10,
        reason: 'Manual correction',
      });

      expect(tx.gamificationProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: { coinBalance: { increment: -10 } },
        create: { userId, coinBalance: 0 },
      });
    });

    it('rejects a zero amount without touching the database', async () => {
      await expect(
        service.adjustCoins(tx as never, {
          userId,
          amount: 0,
          reason: 'invalid',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.gamificationProfile.upsert).not.toHaveBeenCalled();
    });
  });

  describe('reconcileCoinLedger', () => {
    it('reports a balanced ledger with totals separated by transaction type', async () => {
      tx.gamificationProfile.findUniqueOrThrow.mockResolvedValue({
        coinBalance: 35,
      });
      tx.rewardTransaction.groupBy.mockResolvedValue([
        { type: RewardTransactionType.EARNED, _sum: { amount: 50 } },
        { type: RewardTransactionType.SPENT, _sum: { amount: -20 } },
        { type: RewardTransactionType.ADJUSTED, _sum: { amount: 5 } },
      ]);

      const result = await service.reconcileCoinLedger(tx as never, userId);

      expect(result).toEqual({
        profileBalance: 35,
        earned: 50,
        spent: -20,
        adjusted: 5,
        ledgerBalance: 35,
        balanced: true,
      });
      expect(tx.rewardTransaction.groupBy).toHaveBeenCalledWith({
        by: ['type'],
        where: { userId },
        _sum: { amount: true },
      });
    });

    it('reports an imbalanced ledger when the profile balance differs', async () => {
      tx.gamificationProfile.findUniqueOrThrow.mockResolvedValue({
        coinBalance: 40,
      });
      tx.rewardTransaction.groupBy.mockResolvedValue([
        { type: RewardTransactionType.EARNED, _sum: { amount: 35 } },
      ]);

      await expect(
        service.reconcileCoinLedger(tx as never, userId),
      ).resolves.toMatchObject({
        profileBalance: 40,
        ledgerBalance: 35,
        balanced: false,
      });
    });
  });

  describe('grantXp', () => {
    it('increments xp and recomputes mascotLevel, reporting leveledUp when the threshold is crossed', async () => {
      tx.gamificationProfile.upsert.mockResolvedValue({ xp: 90 });

      const result = await service.grantXp(tx as never, {
        userId,
        amount: 20,
      });

      expect(tx.gamificationProfile.update).toHaveBeenCalledWith({
        where: { userId },
        data: { xp: 110, mascotLevel: 2 },
      });
      expect(result).toEqual({ xp: 110, mascotLevel: 2, leveledUp: true });
    });

    it('reports leveledUp: false when the xp award does not cross a level threshold', async () => {
      tx.gamificationProfile.upsert.mockResolvedValue({ xp: 10 });

      const result = await service.grantXp(tx as never, {
        userId,
        amount: 20,
      });

      expect(result).toEqual({ xp: 30, mascotLevel: 1, leveledUp: false });
    });

    it('rejects a non-positive amount without touching the database', async () => {
      await expect(
        service.grantXp(tx as never, { userId, amount: 0 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(tx.gamificationProfile.upsert).not.toHaveBeenCalled();
    });
  });

  describe('advanceStreak', () => {
    it('increments the current streak and tracks the longest, for the payment streak field', async () => {
      tx.gamificationProfile.upsert.mockResolvedValue({
        currentPaymentStreak: 2,
        longestPaymentStreak: 4,
      });

      const result = await service.advanceStreak(tx as never, {
        userId,
        field: 'currentPaymentStreak',
        advance: true,
      });

      expect(tx.gamificationProfile.update).toHaveBeenCalledWith({
        where: { userId },
        data: { currentPaymentStreak: 3, longestPaymentStreak: 4 },
      });
      expect(result).toEqual({ current: 3, longest: 4 });
    });

    it('updates the longest streak once the current streak exceeds it', async () => {
      tx.gamificationProfile.upsert.mockResolvedValue({
        currentPaymentStreak: 4,
        longestPaymentStreak: 4,
      });

      const result = await service.advanceStreak(tx as never, {
        userId,
        field: 'currentPaymentStreak',
        advance: true,
      });

      expect(result).toEqual({ current: 5, longest: 5 });
    });

    it('resets the current streak to 0 without touching the longest streak, for the knowledge streak field', async () => {
      tx.gamificationProfile.upsert.mockResolvedValue({
        currentKnowledgeStreak: 6,
        longestKnowledgeStreak: 9,
      });

      const result = await service.advanceStreak(tx as never, {
        userId,
        field: 'currentKnowledgeStreak',
        advance: false,
      });

      expect(tx.gamificationProfile.update).toHaveBeenCalledWith({
        where: { userId },
        data: { currentKnowledgeStreak: 0, longestKnowledgeStreak: 9 },
      });
      expect(result).toEqual({ current: 0, longest: 9 });
    });
  });

  describe('setMascotMood', () => {
    it('writes mascotMood and stamps mascotMoodUpdatedAt', async () => {
      tx.gamificationProfile.upsert.mockResolvedValue({});

      await service.setMascotMood(tx as never, {
        userId,
        mood: MascotMood.CELEBRATING,
        reason: 'Badge earned',
      });

      expect(tx.gamificationProfile.upsert).toHaveBeenCalledWith({
        where: { userId },
        update: {
          mascotMood: MascotMood.CELEBRATING,
          mascotMoodUpdatedAt: expect.any(Date) as Date,
        },
        create: {
          userId,
          mascotMood: MascotMood.CELEBRATING,
          mascotMoodUpdatedAt: expect.any(Date) as Date,
        },
      });
    });
  });

  describe('notify', () => {
    it('delegates to NotificationsService.create with the same transaction client', async () => {
      const input = {
        userId,
        type: NotificationType.REWARD,
        title: 'Reward earned',
        message: 'You earned 15 coins.',
      };

      await service.notify(tx as never, input);

      expect(notificationsService.create).toHaveBeenCalledWith(input, tx);
    });
  });

  describe('settleAction', () => {
    it('grants coins, xp, advances a streak, and sets mood in one call', async () => {
      tx.gamificationProfile.upsert
        .mockResolvedValueOnce({ coinBalance: 115 }) // grantCoins
        .mockResolvedValueOnce({ xp: 90 }) // grantXp read-before-update
        .mockResolvedValueOnce({
          currentPaymentStreak: 2,
          longestPaymentStreak: 4,
        }) // advanceStreak read-before-update
        .mockResolvedValueOnce({}); // setMascotMood

      const result = await service.settleAction(tx as never, {
        userId,
        sourceEventId: 'payment-event-1',
        coins: { amount: 15, reason: 'On-time payment reward' },
        xp: { amount: 10 },
        streak: { field: 'currentPaymentStreak', advance: true },
        mood: { value: MascotMood.HAPPY, reason: 'On-time payment' },
      });

      expect(result).toEqual({
        coinBalance: 115,
        xp: 100,
        mascotLevel: 2,
        leveledUp: true,
        streak: { current: 3, longest: 4 },
      });
    });

    it('skips coins and xp when amount is 0, but still advances the streak and sets mood', async () => {
      tx.gamificationProfile.upsert
        .mockResolvedValueOnce({
          currentPaymentStreak: 3,
          longestPaymentStreak: 5,
        })
        .mockResolvedValueOnce({});

      const result = await service.settleAction(tx as never, {
        userId,
        sourceEventId: 'payment-event-2',
        coins: { amount: 0, reason: 'Late payment' },
        xp: { amount: 0 },
        streak: { field: 'currentPaymentStreak', advance: false },
        mood: { value: MascotMood.STRESSED, reason: 'Late payment' },
      });

      expect(tx.rewardTransaction.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        streak: { current: 0, longest: 5 },
      });
    });

    it('does nothing beyond what is passed in (no streak/mood keys means no calls)', async () => {
      tx.gamificationProfile.upsert.mockResolvedValue({ coinBalance: 25 });

      const result = await service.settleAction(tx as never, {
        userId,
        sourceEventId: 'quiz-event-1',
        coins: { amount: 25, reason: 'Quiz reward' },
      });

      expect(tx.gamificationProfile.upsert).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ coinBalance: 25 });
    });
  });
});
