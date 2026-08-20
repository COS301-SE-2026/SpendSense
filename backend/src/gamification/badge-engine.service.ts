import { Injectable } from '@nestjs/common';
import {
  BadgeCategory,
  BadgeCriteriaType,
  NotificationType,
  Prisma,
  QuizSessionStatus,
  UserEventSourceType,
  UserEventType,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { RewardService } from '../rewards/reward.service';

type PaymentBadgeInput = {
  userId: string;
  sourceEventId: string;
  onTimePaymentCount: number;
  currentPaymentStreak: number;
  currentScore: number;
};
type ObligationBadgeInput = {
  userId: string;
  sourceEventId: string;
};
type QuizBadgeInput = {
  userId: string;
  sourceEventId: string;
  currentKnowledgeStreak: number;
};
type BadgeDefinitionCandidate = {
  id: string;
  code: string;
  name: string;
  criteriaType: BadgeCriteriaType;
  criteriaValue: number;
  bonusCoins: number;
};

@Injectable()
export class BadgeEngineService {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly rewardService: RewardService,
  ) {}
  async evaluatePaymentBadges(
    input: PaymentBadgeInput,
    client: Prisma.TransactionClient,
  ): Promise<string[]> {
    const badgeDefinitions = await client.badgeDefinition.findMany({
      where: {
        isActive: true,
        NOT: { category: BadgeCategory.DEMO },
        criteriaType: {
          in: [
            BadgeCriteriaType.FIRST_ON_TIME_PAYMENT,
            BadgeCriteriaType.PAYMENT_STREAK_COUNT,
            BadgeCriteriaType.SCORE_REACHED,
          ],
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        criteriaType: true,
        criteriaValue: true,
        bonusCoins: true,
      },
    });
    const qualifiedBadges = badgeDefinitions.filter((badge) =>
      this.meetsPaymentCriteria(badge, input),
    );
    return this.awardBadges(
      input.userId,
      input.sourceEventId,
      qualifiedBadges,
      client,
    );
  }
  async evaluateObligationBadges(
    input: ObligationBadgeInput,
    client: Prisma.TransactionClient,
  ): Promise<string[]> {
    const obligationCount = await client.financialObligation.count({
      where: {
        userId: input.userId,
        deletedAt: null,
      },
    });
    const badgeDefinitions = await client.badgeDefinition.findMany({
      where: {
        isActive: true,
        NOT: {
          category: BadgeCategory.DEMO,
        },
        criteriaType: BadgeCriteriaType.FIRST_OBLIGATION,
      },
      select: {
        id: true,
        code: true,
        name: true,
        criteriaType: true,
        criteriaValue: true,
        bonusCoins: true,
      },
    });
    const qualifiedBadges = badgeDefinitions.filter(
      (badge) => obligationCount >= badge.criteriaValue,
    );
    return this.awardBadges(
      input.userId,
      input.sourceEventId,
      qualifiedBadges,
      client,
    );
  }

  async evaluateQuizBadges(
    input: QuizBadgeInput,
    client: Prisma.TransactionClient,
  ): Promise<string[]> {
    const completedQuizCount = await client.quizSession.count({
      where: {
        userId: input.userId,
        status: QuizSessionStatus.COMPLETED,
      },
    });
    const badgeDefinitions = await client.badgeDefinition.findMany({
      where: {
        isActive: true,
        NOT: { category: BadgeCategory.DEMO },
        criteriaType: {
          in: [
            BadgeCriteriaType.QUIZ_COMPLETED_COUNT,
            BadgeCriteriaType.KNOWLEDGE_STREAK_COUNT,
          ],
        },
      },
      select: {
        id: true,
        code: true,
        name: true,
        criteriaType: true,
        criteriaValue: true,
        bonusCoins: true,
      },
    });
    const qualifiedBadges = badgeDefinitions.filter((badge) => {
      const progress =
        badge.criteriaType === BadgeCriteriaType.QUIZ_COMPLETED_COUNT
          ? completedQuizCount
          : input.currentKnowledgeStreak;
      return progress >= badge.criteriaValue;
    });
    return this.awardBadges(
      input.userId,
      input.sourceEventId,
      qualifiedBadges,
      client,
    );
  }
  private meetsPaymentCriteria(
    badge: BadgeDefinitionCandidate,
    input: PaymentBadgeInput,
  ): boolean {
    switch (badge.criteriaType) {
      case BadgeCriteriaType.FIRST_ON_TIME_PAYMENT:
        return input.onTimePaymentCount >= badge.criteriaValue;
      case BadgeCriteriaType.PAYMENT_STREAK_COUNT:
        return input.currentPaymentStreak >= badge.criteriaValue;
      case BadgeCriteriaType.SCORE_REACHED:
        return input.currentScore >= badge.criteriaValue;
      default:
        return false;
    }
  }
  private async awardBadges(
    userId: string,
    sourceEventId: string,
    badgeDefinitions: BadgeDefinitionCandidate[],
    client: Prisma.TransactionClient,
  ): Promise<string[]> {
    const badgesEarned: string[] = [];
    for (const badge of badgeDefinitions) {
      const existingUserBadge = await client.userBadge.findUnique({
        where: {
          userId_badgeDefinitionId: {
            userId,
            badgeDefinitionId: badge.id,
          },
        },
        select: {
          id: true,
          earnedAt: true,
        },
      });
      if (existingUserBadge?.earnedAt) {
        continue;
      }
      const earnedAt = new Date();
      const userBadge = existingUserBadge
        ? await client.userBadge.update({
            where: {
              id: existingUserBadge.id,
            },
            data: {
              progress: badge.criteriaValue,
              earnedAt,
            },
          })
        : await client.userBadge.create({
            data: {
              userId,
              badgeDefinitionId: badge.id,
              progress: badge.criteriaValue,
              earnedAt,
            },
          });
      const badgeEvent = await client.userEvent.create({
        data: {
          userId,
          eventType: UserEventType.BADGE_EARNED,
          sourceType: UserEventSourceType.BADGE,
          sourceId: userBadge.id,
          metadata: {
            badgeDefinitionId: badge.id,
            badgeCode: badge.code,
            triggerSourceEventId: sourceEventId,
          },
        },
      });
      if (badge.bonusCoins > 0) {
        await this.rewardService.grantCoins(client, {
          userId,
          amount: badge.bonusCoins,
          reason: `Badge unlock: ${badge.name}`,
          sourceEventId: badgeEvent.id,
        });
      }
      await this.notificationsService.create(
        {
          userId,
          type: NotificationType.BADGE_EARNED,
          title: 'Badge earned',
          message: `You earned ${badge.name}.`,
          sourceType: UserEventSourceType.BADGE,
          sourceId: userBadge.id,
        },
        client,
      );
      badgesEarned.push(badge.name);
    }
    return badgesEarned;
  }
}
