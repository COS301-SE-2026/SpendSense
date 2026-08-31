import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InsightsService } from '../insights/insights.service';
import { CreditScoreService } from '../credit-score/credit-score.service';
import type {
  WrappedBadge,
  WrappedSummary,
} from './types/wrapped-summary.type';

@Injectable()
export class MonthlyWrappedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly insightsService: InsightsService,
    private readonly creditScoreService: CreditScoreService,
  ) {}

  async getWrappedResponse(
    userId: string,
    yearMonth: string,
  ): Promise<WrappedSummary> {
    const [year, monthNumber] = yearMonth.split('-').map(Number);
    const month = monthNumber;
    const monthLabel = new Date(
      Date.UTC(year, monthNumber - 1, 1),
    ).toLocaleString('en-ZA', { month: 'long' });

    const asOf = new Date(Date.UTC(year, month));

    const paymentStats = await this.insightsService.getPaymentStreak(
      userId,
      asOf,
    );
    const scoreMovement = await this.getScoreMovementForMonth(
      userId,
      year,
      month,
    );

    const bodgestEardnedDuringMonth = await this.getBadgesForMonth(
      userId,
      year,
      monthNumber,
    );

    return {
      month,
      monthLabel,

      scoreStart: scoreMovement.scoreStartOfMonth,
      scoreEnd: scoreMovement.scoreEndOfMonth,
      scoreDelta: scoreMovement.scoreDelta,
      scoreTierEnd: scoreMovement.scoreTierEnd,

      onTimePayments: paymentStats.currentMonthOnTimeCount,
      latePayments: paymentStats.currentMonthLateCount,
      missedPayments: paymentStats.currentMonthMissedCount,
      onTimePaymentRate: paymentStats.currentMonthOnTimeRate,
      longestPaymentStreakThisMonth:
        paymentStats.longestCurrentMonthOnTimeStreak,

      numberBadgesEarned: bodgestEardnedDuringMonth.length,
      arrayBadgesEarned: bodgestEardnedDuringMonth,

      coinsEarned: 0,
      quizzesCompleted: 0,
      knowledgeStreakEnd: 0,

      hasData: false,
    };
  }

  /////////////////////////////////////////////////////////////////////////

  // gets the badges a user has earned this month
  async getBadgesForMonth(
    userId: string,
    year: number,
    month: number,
  ): Promise<WrappedBadge[]> {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const badges = await this.prisma.userBadge.findMany({
      where: {
        userId,
        earnedAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: {
        earnedAt: 'asc',
      },
      include: {
        badgeDefinition: {
          select: {
            code: true,
            name: true,
            description: true,
            category: true,
            iconKey: true,
          },
        },
      },
    });

    const wrappedBadges: WrappedBadge[] = [];

    for (const badge of badges) {
      if (!badge.earnedAt) {
        throw new Error('Badge is missing earnedAt date.');
      }

      wrappedBadges.push({
        badgeKey: badge.badgeDefinition.code,
        name: badge.badgeDefinition.name,
        iconKey: badge.badgeDefinition.iconKey,
        earnedAt: badge.earnedAt,
      });
    }

    return wrappedBadges;
  }

  /////////////////////////////////////////////////////////////////////////
  // get the score movement for the user this month
  private async getScoreMovementForMonth(
    userId: string,
    year: number,
    month: number,
  ) {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const [firstEventOfMonth, lastEventOfMonth] = await Promise.all([
      // firstEventOfMonth =
      this.prisma.scoreEvent.findFirst({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
        },

        orderBy: {
          createdAt: 'asc',
        },
      }),

      // lastEventOfMonth =
      this.prisma.scoreEvent.findFirst({
        where: {
          userId,
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    if (firstEventOfMonth && lastEventOfMonth) {
      const scoreStartOfMonth = firstEventOfMonth.scoreBefore;
      const scoreEndOfMonth = lastEventOfMonth.scoreAfter;

      return {
        scoreStartOfMonth: scoreStartOfMonth,
        scoreEndOfMonth: scoreEndOfMonth,
        scoreDelta: scoreEndOfMonth - scoreStartOfMonth,
        scoreTierEnd:
          this.creditScoreService.determineScoreTier(scoreEndOfMonth),
        hasScoreData: true,
      };
    }

    return {
      scoreStartOfMonth: 300,
      scoreEndOfMonth: 300,
      scoreDelta: 0,
      scoreTierEnd: this.creditScoreService.determineScoreTier(300),
      hasScoreData: false,
    };
  }
}
