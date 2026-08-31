import { ScoreTier } from '@prisma/client';

export type WrappedBadge = {
  badgeKey: string;
  name: string;
  iconKey: string | null;
  earnedAt: Date;
};

export type WrappedSummary = {
  month: number;
  monthLabel: string;

  scoreStart: number;
  scoreEnd: number;
  scoreDelta: number;
  scoreTierEnd: ScoreTier | null;

  onTimePayments: number;
  latePayments: number;
  missedPayments: number;
  onTimePaymentRate: number;
  longestPaymentStreakThisMonth: number;

  numberBadgesEarned: number;
  arrayBadgesEarned: WrappedBadge[];

  coinsEarned: number;
  quizzesCompleted: number;
  knowledgeStreakEnd: number;

  hasData: boolean;
};
