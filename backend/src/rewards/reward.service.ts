import { BadRequestException, Injectable } from '@nestjs/common';
import { MascotMood, Prisma, RewardTransactionType } from '@prisma/client';
import { calculateMascotLevel } from './mascot-level';

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

type GrantXpInput = {
  userId: string;
  amount: number;
};

type GrantXpResult = {
  xp: number;
  mascotLevel: number;
  leveledUp: boolean;
};

type StreakField = 'currentPaymentStreak' | 'currentKnowledgeStreak';

const LONGEST_STREAK_FIELD: Record<StreakField, 'longestPaymentStreak' | 'longestKnowledgeStreak'> = {
  currentPaymentStreak: 'longestPaymentStreak',
  currentKnowledgeStreak: 'longestKnowledgeStreak',
};

type AdvanceStreakInput = {
  userId: string;
  field: StreakField;
  advance: boolean;
};

type AdvanceStreakResult = {
  current: number;
  longest: number;
};

type SetMascotMoodInput = {
  userId: string;
  mood: MascotMood;
  // Not persisted yet — no column for it on GamificationProfile today. Accepted now so every
  // call site is already passing it once UC-B's `moodReason` profile field lands.
  reason: string;
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

  async grantXp(
    tx: Prisma.TransactionClient,
    { userId, amount }: GrantXpInput,
  ): Promise<GrantXpResult> {
    if (amount <= 0) {
      throw new BadRequestException('grantXp amount must be positive.');
    }
    const before = await tx.gamificationProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    const levelBefore = calculateMascotLevel(before.xp);
    const xp = before.xp + amount;
    const mascotLevel = calculateMascotLevel(xp);
    await tx.gamificationProfile.update({
      where: { userId },
      data: { xp, mascotLevel },
    });
    return { xp, mascotLevel, leveledUp: mascotLevel > levelBefore };
  }

  async advanceStreak(
    tx: Prisma.TransactionClient,
    { userId, field, advance }: AdvanceStreakInput,
  ): Promise<AdvanceStreakResult> {
    const longestField = LONGEST_STREAK_FIELD[field];
    const profile = await tx.gamificationProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    const current = advance ? profile[field] + 1 : 0;
    const longest = Math.max(profile[longestField], current);
    await tx.gamificationProfile.update({
      where: { userId },
      data: { [field]: current, [longestField]: longest },
    });
    return { current, longest };
  }

  async setMascotMood(
    tx: Prisma.TransactionClient,
    { userId, mood }: SetMascotMoodInput,
  ): Promise<void> {
    await tx.gamificationProfile.upsert({
      where: { userId },
      update: { mascotMood: mood, mascotMoodUpdatedAt: new Date() },
      create: { userId, mascotMood: mood, mascotMoodUpdatedAt: new Date() },
    });
  }
}
