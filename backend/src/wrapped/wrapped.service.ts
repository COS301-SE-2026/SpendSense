import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InsightsService } from 'src/insights/insights.service';
import type { WrappedSummary } from './types/wrapped-summary.type';

@Injectable()
export class MonthlyWrappedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly insightsService: InsightsService,
  ) {}

  async getWrappedResponse(
    userId: string,
    yearMonth: string,
  ): Promise<WrappedSummary> {
    const asOf = new Date();
    const paymentStats = await this.insightsService.getPaymentStreak(
      userId,
      asOf,
    );

    const [year, monthNumber] = yearMonth.split('-').map(Number);
    const month = monthNumber;
    const monthLabel = new Date(
      Date.UTC(year, monthNumber - 1, 1),
    ).toLocaleString('en-ZA', { month: 'long' });

    return {
      month,
      monthLabel,

      scoreStart: 0,
      scoreEnd: 0,
      scoreDelta: 0,
      scoreTierEnd: null,

      onTimePayments: paymentStats.currentMonthOnTimeCount,
      latePayments: paymentStats.currentMonthLateCount,
      missedPayments: paymentStats.currentMonthMissedCount,
      onTimePaymentRate: paymentStats.currentMonthOnTimeRate,
      longestPaymentStreakThisMonth:
        paymentStats.longestCurrentMonthOnTimeStreak,

      badgesEarned: [],

      coinsEarned: 0,
      quizzesCompleted: 0,
      knowledgeStreakEnd: 0,

      hasData: false,
    };
  }

  async getBadgesForMonth(userId: string, year: number, month: number) {
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

    return {
      year,
      month,
      badgesEarned: badges.length,
      badges: badges.map((badge) => ({
        badgeKey: badge.badgeDefinition.code,
        name: badge.badgeDefinition.name,
        iconKey: badge.badgeDefinition.iconKey,
        earnedAt: badge.earnedAt,
      })),
    };
  }
}
