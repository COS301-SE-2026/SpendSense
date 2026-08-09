import { BadRequestException } from '@nestjs/common';
import { RewardTransactionType } from '@prisma/client';
import { InsufficientCoinsException, RewardService } from './reward.service';

// to run the tests in this file by itself: npm test -- reward.service.spec.ts
type PrismaMockMethod = jest.Mock<Promise<unknown>, [unknown]>;

type RewardPrismaMock = {
  gamificationProfile: {
    upsert: PrismaMockMethod;
    updateMany: PrismaMockMethod;
    findUniqueOrThrow: PrismaMockMethod;
  };
  rewardTransaction: {
    create: PrismaMockMethod;
  };
};

describe('RewardService', () => {
  let service: RewardService;
  let tx: RewardPrismaMock;

  const userId = 'user-1';

  beforeEach(() => {
    service = new RewardService();
    tx = {
      gamificationProfile: {
        upsert: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      rewardTransaction: {
        create: jest.fn(),
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
        async ({ where, data }: { where: { coinBalance: { gte: number } }; data: { coinBalance: { decrement: number } } }) => {
          if (balance >= where.coinBalance.gte) {
            balance -= data.coinBalance.decrement;
            return { count: 1 };
          }
          return { count: 0 };
        },
      );
      tx.gamificationProfile.findUniqueOrThrow.mockImplementation(async () => ({
        coinBalance: balance,
      }));

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
});
