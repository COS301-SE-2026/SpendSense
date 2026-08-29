import { BadRequestException, Injectable } from '@nestjs/common';
import { MascotMood, Prisma, RewardTransactionType } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateNotificationInput } from '../notifications/dto/create-notification.dto';
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

const LONGEST_STREAK_FIELD: Record<
  StreakField,
  'longestPaymentStreak' | 'longestKnowledgeStreak'
> = {
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
  reason: string;
  sourceEventId?: string;
};

type SettleActionInput = {
  userId: string;
  sourceEventId: string;
  coins?: { amount: number; reason: string };
  xp?: { amount: number };
  streak?: { field: StreakField; advance: boolean };
  mood?: { value: MascotMood; reason: string };
};

type SettleActionResult = {
  coinBalance?: number;
  xp?: number;
  mascotLevel?: number;
  leveledUp?: boolean;
  streak?: AdvanceStreakResult;
};

export type CoinLedgerReconciliation = {
  profileBalance: number;
  earned: number;
  spent: number;
  adjusted: number;
  ledgerBalance: number;
  balanced: boolean;
};

@Injectable()
export class RewardService {
  constructor(private readonly notificationsService: NotificationsService) {}
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

  /**
   * Reconciles the append-only coin ledger with the current profile balance.
   * This is an internal acceptance/diagnostic check, not a user-facing endpoint.
   */
  async reconcileCoinLedger(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<CoinLedgerReconciliation> {
    const [profile, transactionsByType] = await Promise.all([
      tx.gamificationProfile.findUniqueOrThrow({
        where: { userId },
        select: { coinBalance: true },
      }),
      tx.rewardTransaction.groupBy({
        by: ['type'],
        where: { userId },
        _sum: { amount: true },
      }),
    ]);

    const totals = {
      earned: 0,
      spent: 0,
      adjusted: 0,
    };
    for (const transaction of transactionsByType) {
      const amount = transaction._sum.amount ?? 0;
      if (transaction.type === RewardTransactionType.EARNED) {
        totals.earned = amount;
      } else if (transaction.type === RewardTransactionType.SPENT) {
        totals.spent = amount;
      } else if (transaction.type === RewardTransactionType.ADJUSTED) {
        totals.adjusted = amount;
      }
    }

    const ledgerBalance = totals.earned + totals.spent + totals.adjusted;
    return {
      profileBalance: profile.coinBalance,
      ...totals,
      ledgerBalance,
      balanced: ledgerBalance === profile.coinBalance,
    };
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
    { userId, mood, reason, sourceEventId }: SetMascotMoodInput,
  ): Promise<void> {
    const now = new Date();

    await tx.gamificationProfile.upsert({
      where: { userId },
      update: { mascotMood: mood, mascotMoodUpdatedAt: now },
      create: { userId, mascotMood: mood, mascotMoodUpdatedAt: now },
    });

    if (sourceEventId) {
      const sourceEvent = await tx.userEvent.findUnique({
        where: {
          id: sourceEventId,
        },
        select: {
          metadata: true,
        },
      });

      const metadataExisting =
        sourceEvent?.metadata &&
        typeof sourceEvent.metadata === 'object' &&
        !Array.isArray(sourceEvent.metadata)
          ? sourceEvent.metadata
          : {};

      await tx.userEvent.update({
        where: {
          id: sourceEventId,
        },
        data: {
          metadata: {
            ...metadataExisting,
            mascotMood: mood,
            moodReason: reason,
          },
        },
      });
    }
  }

  // Not auto-fired by grantCoins/spendCoins/etc - not every reward mutation deserves its own
  // notification (e.g. a payment reward is already covered by the score-change notification).
  // Every call site reaches NotificationsService through here only so they're consistent about it.
  async notify(
    tx: Prisma.TransactionClient,
    input: CreateNotificationInput,
  ): Promise<void> {
    await this.notificationsService.create(input, tx);
  }

  // Composed helper for the common caller shape (grant coins + xp, advance a streak, set a mood).
  // Wager/Cosmetics purchases deliberately don't use this - they only need spendCoins/adjustCoins
  // directly, not this bundle, which is why the primitives above stay separately callable.
  async settleAction(
    tx: Prisma.TransactionClient,
    input: SettleActionInput,
  ): Promise<SettleActionResult> {
    const result: SettleActionResult = {};
    if (input.coins && input.coins.amount > 0) {
      const { coinBalance } = await this.grantCoins(tx, {
        userId: input.userId,
        amount: input.coins.amount,
        reason: input.coins.reason,
        sourceEventId: input.sourceEventId,
      });
      result.coinBalance = coinBalance;
    }
    if (input.xp && input.xp.amount > 0) {
      const { xp, mascotLevel, leveledUp } = await this.grantXp(tx, {
        userId: input.userId,
        amount: input.xp.amount,
      });
      result.xp = xp;
      result.mascotLevel = mascotLevel;
      result.leveledUp = leveledUp;
    }
    if (input.streak) {
      result.streak = await this.advanceStreak(tx, {
        userId: input.userId,
        field: input.streak.field,
        advance: input.streak.advance,
      });
    }
    if (input.mood) {
      await this.setMascotMood(tx, {
        userId: input.userId,
        mood: input.mood.value,
        reason: input.mood.reason,
      });
    }
    return result;
  }
}
