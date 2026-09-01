import {
  BadgeCategory,
  BadgeCriteriaType,
  NotificationType,
  Prisma,
  UserEventSourceType,
  UserEventType,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { RewardService } from '../rewards/reward.service';
import { BadgeEngineService } from './badge-engine.service';

describe('BadgeEngineService', () => {
  let service: BadgeEngineService;
  let notificationsService: {
    create: jest.Mock;
  };
  let rewardService: {
    grantCoins: jest.Mock;
    setMascotMood: jest.Mock;
  };
  let transaction: {
    badgeDefinition: {
      findMany: jest.Mock;
    };
    financialObligation: {
      count: jest.Mock;
    };
    quizSession: {
      count: jest.Mock;
    };
    userBadge: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    userEvent: {
      create: jest.Mock;
    };
  };
  const firstOnTimeBadge = {
    id: 'badge-definition-1',
    code: 'FIRST_ON_TIME_PAYMENT',
    name: 'On-Time Starter',
    criteriaType: BadgeCriteriaType.FIRST_ON_TIME_PAYMENT,
    criteriaValue: 1,
    bonusCoins: 25,
  };
  const firstObligationBadge = {
    id: 'badge-definition-2',
    code: 'FIRST_OBLIGATION_CREATED',
    name: 'First Obligation',
    criteriaType: BadgeCriteriaType.FIRST_OBLIGATION,
    criteriaValue: 1,
    bonusCoins: 20,
  };
  const firstQuizBadge = {
    id: 'badge-definition-4',
    code: 'FIRST_QUIZ_COMPLETION',
    name: 'Quiz Starter',
    criteriaType: BadgeCriteriaType.QUIZ_COMPLETED_COUNT,
    criteriaValue: 1,
    bonusCoins: 15,
  };
  const knowledgeStreakBadge = {
    id: 'badge-definition-5',
    code: 'THREE_DAY_KNOWLEDGE_STREAK',
    name: 'Knowledge Builder',
    criteriaType: BadgeCriteriaType.KNOWLEDGE_STREAK_COUNT,
    criteriaValue: 3,
    bonusCoins: 50,
  };
  beforeEach(() => {
    notificationsService = {
      create: jest.fn().mockResolvedValue({ id: 'notification-1' }),
    };
    rewardService = {
      grantCoins: jest.fn().mockResolvedValue({ coinBalance: 0 }),
      setMascotMood: jest.fn().mockResolvedValue(undefined),
    };
    transaction = {
      badgeDefinition: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      financialObligation: {
        count: jest.fn().mockResolvedValue(0),
      },
      quizSession: {
        count: jest.fn().mockResolvedValue(0),
      },
      userBadge: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'user-badge-1' }),
        update: jest.fn().mockResolvedValue({ id: 'user-badge-1' }),
      },
      userEvent: {
        create: jest.fn().mockResolvedValue({ id: 'badge-event-1' }),
      },
    };
    service = new BadgeEngineService(
      notificationsService as unknown as NotificationsService,
      rewardService as unknown as RewardService,
    );
  });
  it('creates a badge and notification when a payment badge is earned', async () => {
    transaction.badgeDefinition.findMany.mockResolvedValue([firstOnTimeBadge]);
    const result = await service.evaluatePaymentBadges(
      {
        userId: 'user-1',
        sourceEventId: 'payment-event-1',
        onTimePaymentCount: 1,
        currentPaymentStreak: 1,
        currentScore: 608,
      },
      transaction as unknown as Prisma.TransactionClient,
    );
    expect(transaction.badgeDefinition.findMany).toHaveBeenCalledWith({
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
    expect(transaction.userBadge.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        badgeDefinitionId: firstOnTimeBadge.id,
        progress: firstOnTimeBadge.criteriaValue,
        earnedAt: expect.any(Date) as Date,
      },
    });
    expect(transaction.userEvent.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        eventType: UserEventType.BADGE_EARNED,
        sourceType: UserEventSourceType.BADGE,
        sourceId: 'user-badge-1',
        metadata: {
          badgeDefinitionId: firstOnTimeBadge.id,
          badgeCode: firstOnTimeBadge.code,
          triggerSourceEventId: 'payment-event-1',
        },
      },
    });
    expect(rewardService.grantCoins).toHaveBeenCalledWith(transaction, {
      userId: 'user-1',
      amount: firstOnTimeBadge.bonusCoins,
      reason: 'Badge unlock: On-Time Starter',
      sourceEventId: 'badge-event-1',
    });
    expect(rewardService.setMascotMood).toHaveBeenCalledWith(transaction, {
      userId: 'user-1',
      mood: 'CELEBRATING',
      reason: 'Earned the On-Time Starter badge',
      sourceEventId: 'badge-event-1',
    });
    expect(notificationsService.create).toHaveBeenCalledWith(
      {
        userId: 'user-1',
        type: NotificationType.BADGE_EARNED,
        title: 'Badge earned',
        message: 'You earned On-Time Starter.',
        sourceType: UserEventSourceType.BADGE,
        sourceId: 'user-badge-1',
      },
      transaction,
    );
    expect(result).toEqual(['On-Time Starter']);
  });
  it('does not grant a bonus when the badge has no bonusCoins configured', async () => {
    transaction.badgeDefinition.findMany.mockResolvedValue([
      { ...firstOnTimeBadge, bonusCoins: 0 },
    ]);
    await service.evaluatePaymentBadges(
      {
        userId: 'user-1',
        sourceEventId: 'payment-event-1',
        onTimePaymentCount: 1,
        currentPaymentStreak: 1,
        currentScore: 608,
      },
      transaction as unknown as Prisma.TransactionClient,
    );
    expect(rewardService.grantCoins).not.toHaveBeenCalled();
    expect(notificationsService.create).toHaveBeenCalledTimes(1);
  });
  it('does not create another notification when the badge is already earned', async () => {
    transaction.badgeDefinition.findMany.mockResolvedValue([firstOnTimeBadge]);
    transaction.userBadge.findUnique.mockResolvedValue({
      id: 'user-badge-1',
      earnedAt: new Date(),
    });
    const result = await service.evaluatePaymentBadges(
      {
        userId: 'user-1',
        sourceEventId: 'payment-event-1',
        onTimePaymentCount: 1,
        currentPaymentStreak: 1,
        currentScore: 608,
      },
      transaction as unknown as Prisma.TransactionClient,
    );
    expect(transaction.userBadge.create).not.toHaveBeenCalled();
    expect(transaction.userBadge.update).not.toHaveBeenCalled();
    expect(transaction.userEvent.create).not.toHaveBeenCalled();
    expect(rewardService.grantCoins).not.toHaveBeenCalled();
    expect(notificationsService.create).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
  it('updates an existing badge progress record when it becomes earned', async () => {
    transaction.badgeDefinition.findMany.mockResolvedValue([firstOnTimeBadge]);
    transaction.userBadge.findUnique.mockResolvedValue({
      id: 'user-badge-1',
      earnedAt: null,
    });
    const result = await service.evaluatePaymentBadges(
      {
        userId: 'user-1',
        sourceEventId: 'payment-event-1',
        onTimePaymentCount: 1,
        currentPaymentStreak: 1,
        currentScore: 608,
      },
      transaction as unknown as Prisma.TransactionClient,
    );
    expect(transaction.userBadge.update).toHaveBeenCalledWith({
      where: {
        id: 'user-badge-1',
      },
      data: {
        progress: firstOnTimeBadge.criteriaValue,
        earnedAt: expect.any(Date) as Date,
      },
    });
    expect(transaction.userBadge.create).not.toHaveBeenCalled();
    expect(notificationsService.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(['On-Time Starter']);
  });
  it('does not award a badge when the user does not meet the criteria', async () => {
    transaction.badgeDefinition.findMany.mockResolvedValue([
      {
        id: 'badge-definition-3',
        code: 'THREE_PAYMENT_STREAK',
        name: 'Three Payment Streak',
        criteriaType: BadgeCriteriaType.PAYMENT_STREAK_COUNT,
        criteriaValue: 3,
        bonusCoins: 50,
      },
    ]);
    const result = await service.evaluatePaymentBadges(
      {
        userId: 'user-1',
        sourceEventId: 'payment-event-1',
        onTimePaymentCount: 1,
        currentPaymentStreak: 2,
        currentScore: 608,
      },
      transaction as unknown as Prisma.TransactionClient,
    );
    expect(transaction.userBadge.findUnique).not.toHaveBeenCalled();
    expect(transaction.userBadge.create).not.toHaveBeenCalled();
    expect(transaction.userEvent.create).not.toHaveBeenCalled();
    expect(notificationsService.create).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
  it('does not create a notification when badge persistence fails', async () => {
    transaction.badgeDefinition.findMany.mockResolvedValue([firstOnTimeBadge]);
    transaction.userBadge.create.mockRejectedValue(
      new Error('Badge creation failed'),
    );
    await expect(
      service.evaluatePaymentBadges(
        {
          userId: 'user-1',
          sourceEventId: 'payment-event-1',
          onTimePaymentCount: 1,
          currentPaymentStreak: 1,
          currentScore: 608,
        },
        transaction as unknown as Prisma.TransactionClient,
      ),
    ).rejects.toThrow('Badge creation failed');
    expect(transaction.userEvent.create).not.toHaveBeenCalled();
    expect(rewardService.grantCoins).not.toHaveBeenCalled();
    expect(notificationsService.create).not.toHaveBeenCalled();
  });
  it('creates the first obligation badge and notification', async () => {
    transaction.financialObligation.count.mockResolvedValue(1);
    transaction.badgeDefinition.findMany.mockResolvedValue([
      firstObligationBadge,
    ]);
    const result = await service.evaluateObligationBadges(
      {
        userId: 'user-1',
        sourceEventId: 'obligation-event-1',
      },
      transaction as unknown as Prisma.TransactionClient,
    );
    expect(transaction.financialObligation.count).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        deletedAt: null,
      },
    });
    expect(transaction.badgeDefinition.findMany).toHaveBeenCalledWith({
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
    expect(transaction.userBadge.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        badgeDefinitionId: firstObligationBadge.id,
        progress: firstObligationBadge.criteriaValue,
        earnedAt: expect.any(Date) as Date,
      },
    });
    expect(rewardService.grantCoins).toHaveBeenCalledWith(transaction, {
      userId: 'user-1',
      amount: firstObligationBadge.bonusCoins,
      reason: 'Badge unlock: First Obligation',
      sourceEventId: 'badge-event-1',
    });
    expect(notificationsService.create).toHaveBeenCalledWith(
      {
        userId: 'user-1',
        type: NotificationType.BADGE_EARNED,
        title: 'Badge earned',
        message: 'You earned First Obligation.',
        sourceType: UserEventSourceType.BADGE,
        sourceId: 'user-badge-1',
      },
      transaction,
    );
    expect(result).toEqual(['First Obligation']);
  });
  it('awards quiz completion and knowledge streak badges', async () => {
    transaction.quizSession.count.mockResolvedValue(1);
    transaction.badgeDefinition.findMany.mockResolvedValue([
      firstQuizBadge,
      knowledgeStreakBadge,
    ]);

    const result = await service.evaluateQuizBadges(
      {
        userId: 'user-1',
        sourceEventId: 'quiz-event-1',
        currentKnowledgeStreak: 3,
      },
      transaction as unknown as Prisma.TransactionClient,
    );

    expect(transaction.quizSession.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: 'COMPLETED' },
    });
    expect(transaction.badgeDefinition.findMany).toHaveBeenCalledWith({
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
    expect(transaction.userBadge.create).toHaveBeenCalledTimes(2);
    expect(rewardService.grantCoins).toHaveBeenCalledTimes(2);
    expect(notificationsService.create).toHaveBeenCalledTimes(2);
    expect(result).toEqual(['Quiz Starter', 'Knowledge Builder']);
  });
  it('does not award quiz badges below either threshold', async () => {
    transaction.quizSession.count.mockResolvedValue(0);
    transaction.badgeDefinition.findMany.mockResolvedValue([
      firstQuizBadge,
      knowledgeStreakBadge,
    ]);

    const result = await service.evaluateQuizBadges(
      {
        userId: 'user-1',
        sourceEventId: 'quiz-event-1',
        currentKnowledgeStreak: 2,
      },
      transaction as unknown as Prisma.TransactionClient,
    );

    expect(transaction.userBadge.findUnique).not.toHaveBeenCalled();
    expect(rewardService.grantCoins).not.toHaveBeenCalled();
    expect(notificationsService.create).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});
