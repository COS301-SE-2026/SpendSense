import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, RewardTransactionType } from '@prisma/client';

export class InsufficientCoinsException extends BadRequestException {
  constructor(userId: string, amount: number) {
    super(`User ${userId} does not have enough coins to spend ${amount}.`);
  }
}

type CoinMutationInput = {
  userId: string;
  amount: number;
  reason: string;
  sourceEventId?: string;
};

type CoinMutationResult = {
  coinBalance: number;
};

@Injectable()
export class RewardService {
  async grantCoins(
    tx: Prisma.TransactionClient,
    { userId, amount, reason, sourceEventId }: CoinMutationInput,
  ): Promise<CoinMutationResult> {
    if (amount <= 0) {
      throw new BadRequestException('grantCoins amount must be positive.');
    }
    const profile = await tx.gamificationProfile.upsert({
      where: { userId },
      update: { coinBalance: { increment: amount } },
      create: { userId, coinBalance: amount },
    });
    await tx.rewardTransaction.create({
      data: {
        userId,
        sourceEventId: sourceEventId ?? null,
        type: RewardTransactionType.EARNED,
        amount,
        balanceAfter: profile.coinBalance,
        reason,
      },
    });
    return { coinBalance: profile.coinBalance };
  }

  // Never findUnique -> check in app code -> update: a race between two spends for the
  // same user must not be able to both pass a balance check taken before either commits.
  // The updateMany's WHERE clause is the only thing that has to be correct here; the
  // findUniqueOrThrow after it is just reporting the resulting balance for the ledger.
  async spendCoins(
    tx: Prisma.TransactionClient,
    { userId, amount, reason, sourceEventId }: CoinMutationInput,
  ): Promise<CoinMutationResult> {
    if (amount <= 0) {
      throw new BadRequestException('spendCoins amount must be positive.');
    }
    const result = await tx.gamificationProfile.updateMany({
      where: { userId, coinBalance: { gte: amount } },
      data: { coinBalance: { decrement: amount } },
    });
    if (result.count === 0) {
      throw new InsufficientCoinsException(userId, amount);
    }
    const profile = await tx.gamificationProfile.findUniqueOrThrow({
      where: { userId },
      select: { coinBalance: true },
    });
    await tx.rewardTransaction.create({
      data: {
        userId,
        sourceEventId: sourceEventId ?? null,
        type: RewardTransactionType.SPENT,
        amount: -amount,
        balanceAfter: profile.coinBalance,
        reason,
      },
    });
    return { coinBalance: profile.coinBalance };
  }

  async adjustCoins(
    tx: Prisma.TransactionClient,
    { userId, amount, reason, sourceEventId }: CoinMutationInput,
  ): Promise<CoinMutationResult> {
    if (amount === 0) {
      throw new BadRequestException('adjustCoins amount must be non-zero.');
    }
    const profile = await tx.gamificationProfile.upsert({
      where: { userId },
      update: { coinBalance: { increment: amount } },
      // A brand-new profile can't start negative even if the first-ever event is a downward adjustment.
      create: { userId, coinBalance: Math.max(amount, 0) },
    });
    await tx.rewardTransaction.create({
      data: {
        userId,
        sourceEventId: sourceEventId ?? null,
        type: RewardTransactionType.ADJUSTED,
        amount,
        balanceAfter: profile.coinBalance,
        reason,
      },
    });
    return { coinBalance: profile.coinBalance };
  }
}
