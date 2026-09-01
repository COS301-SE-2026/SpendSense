import { ScoreTier } from '@prisma/client';

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
  coinEvents: WrappedCoinEvent[];

  quizzesCompleted: number;
  knowledgeStreakEnd: number;

  hasData: boolean;
};

export type WrappedBadge = {
  badgeKey: string;
  name: string;
  iconKey: string | null;
  earnedAt: Date;
};

export type WrappedCoinEvent = {
  eventType: string;
  amount: number;
  reason: string;
  earnedAt: Date;
};

/**
 * Example response:
 * 
{
  "month": 8,
  "monthLabel": "August",
  "scoreStart": 642,
  "scoreEnd": 681,
  "scoreDelta": 39,
  "scoreTierEnd": "GOOD",

  "onTimePayments": 7,
  "latePayments": 1,
  "missedPayments": 0,
  "onTimePaymentRate": 87.5,
  "longestPaymentStreakThisMonth": 6,

  "numberBadgesEarned": 3,
  "arrayBadgesEarned": [
    {
      "badgeKey": "payment_streak_5",
      "name": "On a Roll",
      "iconKey": "flame",
      "earnedAt": "2026-08-08T09:14:00.000Z"
    },
    {
      "badgeKey": "quiz_master",
      "name": "Quiz Master",
      "iconKey": "brain",
      "earnedAt": "2026-08-17T15:42:00.000Z"
    },
    {
      "badgeKey": "score_climber",
      "name": "Score Climber",
      "iconKey": "trending-up",
      "earnedAt": "2026-08-27T18:05:00.000Z"
    }
  ],

  "coinsEarned": 185,
  "coinEvents": [
    {
      "eventType": "PAYMENT_ON_TIME",
      "amount": 20,
      "reason": "Paid Netflix subscription on time",
      "earnedAt": "2026-08-03T08:32:00.000Z"
    },
    {
      "eventType": "PAYMENT_ON_TIME",
      "amount": 20,
      "reason": "Paid mobile phone account on time",
      "earnedAt": "2026-08-06T10:15:00.000Z"
    },
    {
      "eventType": "PAYMENT_STREAK",
      "amount": 50,
      "reason": "Reached a 5-payment on-time streak",
      "earnedAt": "2026-08-08T09:14:00.000Z"
    },
    {
      "eventType": "QUIZ_COMPLETED",
      "amount": 15,
      "reason": "Completed the Credit Basics quiz",
      "earnedAt": "2026-08-12T16:20:00.000Z"
    },
    {
      "eventType": "QUIZ_COMPLETED",
      "amount": 15,
      "reason": "Completed the Debt Management quiz",
      "earnedAt": "2026-08-17T15:40:00.000Z"
    },
    {
      "eventType": "BADGE_EARNED",
      "amount": 25,
      "reason": "Earned the Quiz Master badge",
      "earnedAt": "2026-08-17T15:42:00.000Z"
    },
    {
      "eventType": "CREDIT_SCORE_IMPROVEMENT",
      "amount": 40,
      "reason": "Credit score improved by 39 points this month",
      "earnedAt": "2026-08-31T20:00:00.000Z"
    }
  ],

  "quizzesCompleted": 4,
  "knowledgeStreakEnd": 7,

  "hasData": true
}
 * 
 */
