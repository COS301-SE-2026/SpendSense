import {
  GuidanceWalkthroughStatus,
  QuizSessionType,
  PaymentContributionState,
  PaymentOccurrenceStatus,
} from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { UsersService } from '../users/users.service';
import { GuidanceService } from './guidance.service';
import { UnauthorizedException } from '@nestjs/common';

type GuidanceUpsertArgs = {
  where: {
    userId: string;
  };
  create: {
    userId: string;
    tipsEnabled: boolean;
    dailyExpansionEnabled: boolean;
    walkthroughStatus: GuidanceWalkthroughStatus;
    walkthroughStep: number;
    dismissedTipIds: unknown[];
  };
  update: {
    tipsEnabled?: boolean;
    dailyExpansionEnabled?: boolean;
    walkthroughStatus: GuidanceWalkthroughStatus;
    walkthroughStep: number;
    dismissedTipIds: unknown[];
  };
};

describe('GuidanceService', () => {
  let service: GuidanceService;

  let prisma: {
    guidanceState: {
      findUnique: jest.Mock;
      create: jest.Mock;
      upsert: jest.Mock<Promise<unknown>, [GuidanceUpsertArgs]>;
    };
    quizSession: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    gamificationProfile: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    paymentContribution: {
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      deleteMany: jest.Mock;
    };
    userInventoryItem: {
      update: jest.Mock;
    };
    rewardTransaction: {
      create: jest.Mock;
    };
  };

  let usersService: jest.Mocked<Pick<UsersService, 'findOrCreateUser'>>;

  const authUser = {
    supabaseAuthId: 'test-supabase-user',
    email: 'test-user@example.com',
  };

  beforeEach(() => {
    prisma = {
      guidanceState: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn<Promise<unknown>, [GuidanceUpsertArgs]>(),
      },
      quizSession: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      gamificationProfile: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      paymentContribution: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      userInventoryItem: {
        update: jest.fn(),
      },
      rewardTransaction: {
        create: jest.fn(),
      },
    };

    usersService = {
      findOrCreateUser: jest.fn(),
    };

    service = new GuidanceService(
      prisma as unknown as PrismaService,
      usersService as unknown as UsersService,
    );
  });

  it('will return the saved guidance state', async () => {
    const updatedAt = new Date('2026-09-17T12:00:00.000Z');

    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.guidanceState.findUnique.mockResolvedValue({
      id: 'guidance-state-1',
      userId: 'user-1',
      tipsEnabled: false,
      dailyExpansionEnabled: false,
      walkthroughStatus: GuidanceWalkthroughStatus.IN_PROGRESS,
      walkthroughStep: 2,
      dismissedTipIds: ['calendar.overdue.explainer'],
      createdAt: new Date('2026-09-17T10:00:00.000Z'),
      updatedAt,
    });

    await expect(service.getState(authUser)).resolves.toEqual({
      tipsEnabled: false,
      dailyExpansionEnabled: false,
      walkthrough: {
        status: GuidanceWalkthroughStatus.IN_PROGRESS,
        currentStep: 2,
      },
      dismissedTipIds: ['calendar.overdue.explainer'],
      updatedAt,
    });
  });

  it('will return default guidance state when there is no saved state', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.guidanceState.findUnique.mockResolvedValue(null);

    await expect(service.getState(authUser)).resolves.toEqual({
      tipsEnabled: true,
      dailyExpansionEnabled: true,
      walkthrough: {
        status: GuidanceWalkthroughStatus.NOT_STARTED,
        currentStep: 0,
      },
      dismissedTipIds: [],
      updatedAt: null,
    });
  });

  it('will not create guidance state when defaults are returned', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.guidanceState.findUnique.mockResolvedValue(null);

    await service.getState(authUser);

    expect(prisma.guidanceState.create).not.toHaveBeenCalled();
  });

  it('will look up guidance state using user id', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.guidanceState.findUnique.mockResolvedValue(null);

    await service.getState(authUser);

    expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);

    expect(prisma.guidanceState.findUnique).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
      },
    });
  });

  it('will create a guidance state on the first update', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.guidanceState.findUnique.mockResolvedValue(null);

    const updatedAt = new Date('2026-09-19T00:00:00.000Z');

    prisma.guidanceState.upsert.mockResolvedValue({
      id: 'guidance-state-1',
      userId: 'user-1',
      tipsEnabled: false,
      dailyExpansionEnabled: true,
      walkthroughStatus: GuidanceWalkthroughStatus.NOT_STARTED,
      walkthroughStep: 0,
      dismissedTipIds: [],
      createdAt: updatedAt,
      updatedAt,
    });

    await expect(
      service.updateState(authUser, {
        tipsEnabled: false,
      }),
    ).resolves.toEqual({
      tipsEnabled: false,
      dailyExpansionEnabled: true,
      walkthrough: {
        status: GuidanceWalkthroughStatus.NOT_STARTED,
        currentStep: 0,
      },
      dismissedTipIds: [],
      updatedAt,
    });

    expect(prisma.guidanceState.upsert).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
      },
      create: {
        userId: 'user-1',
        tipsEnabled: false,
        dailyExpansionEnabled: true,
        walkthroughStatus: GuidanceWalkthroughStatus.NOT_STARTED,
        walkthroughStep: 0,
        dismissedTipIds: [],
      },
      update: {
        tipsEnabled: false,
        walkthroughStatus: GuidanceWalkthroughStatus.NOT_STARTED,
        walkthroughStep: 0,
        dismissedTipIds: [],
      },
    });
  });

  it('will preserve existing guidance values that arent updated', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.guidanceState.findUnique.mockResolvedValue({
      id: 'guidance-state-1',
      userId: 'user-1',
      tipsEnabled: true,
      dailyExpansionEnabled: false,
      walkthroughStatus: GuidanceWalkthroughStatus.IN_PROGRESS,
      walkthroughStep: 2,
      dismissedTipIds: ['calendar.overdue.explainer'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const updatedAt = new Date('2026-09-19T10:00:00.000Z');

    prisma.guidanceState.upsert.mockResolvedValue({
      id: 'guidance-state-1',
      userId: 'user-1',
      tipsEnabled: false,
      dailyExpansionEnabled: false,
      walkthroughStatus: GuidanceWalkthroughStatus.IN_PROGRESS,
      walkthroughStep: 2,
      dismissedTipIds: ['calendar.overdue.explainer'],
      createdAt: new Date(),
      updatedAt,
    });

    await service.updateState(authUser, {
      tipsEnabled: false,
    });

    expect(prisma.guidanceState.upsert).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
      },
      create: {
        userId: 'user-1',
        tipsEnabled: false,
        dailyExpansionEnabled: true,
        walkthroughStatus: GuidanceWalkthroughStatus.IN_PROGRESS,
        walkthroughStep: 2,
        dismissedTipIds: ['calendar.overdue.explainer'],
      },
      update: {
        tipsEnabled: false,
        walkthroughStatus: GuidanceWalkthroughStatus.IN_PROGRESS,
        walkthroughStep: 2,
        dismissedTipIds: ['calendar.overdue.explainer'],
      },
    });
  });

  it('will replay the walkthrough from the beginning', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.guidanceState.findUnique.mockResolvedValue({
      walkthroughStatus: GuidanceWalkthroughStatus.COMPLETED,
      walkthroughStep: 4,
      dismissedTipIds: [],
    });

    prisma.guidanceState.upsert.mockResolvedValue({
      tipsEnabled: true,
      dailyExpansionEnabled: true,
      walkthroughStatus: GuidanceWalkthroughStatus.IN_PROGRESS,
      walkthroughStep: 0,
      dismissedTipIds: [],
      updatedAt: new Date(),
    });

    await service.updateState(authUser, {
      replayWalkthrough: true,
    });

    expect(prisma.guidanceState.upsert).toHaveBeenCalledTimes(1);

    const upsertCall = prisma.guidanceState.upsert.mock.calls[0][0];

    expect(upsertCall.update.walkthroughStatus).toBe(
      GuidanceWalkthroughStatus.IN_PROGRESS,
    );
    expect(upsertCall.update.walkthroughStep).toBe(0);
  });

  it('will add a tip id that is dismissed', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.guidanceState.findUnique.mockResolvedValue({
      walkthroughStatus: GuidanceWalkthroughStatus.NOT_STARTED,
      walkthroughStep: 0,
      dismissedTipIds: ['calendar.overdue.explainer'],
    });

    prisma.guidanceState.upsert.mockResolvedValue({
      tipsEnabled: true,
      dailyExpansionEnabled: true,
      walkthroughStatus: GuidanceWalkthroughStatus.NOT_STARTED,
      walkthroughStep: 0,
      dismissedTipIds: ['calendar.overdue.explainer'],
      updatedAt: new Date(),
    });

    await service.updateState(authUser, {
      dismissTipId: 'calendar.overdue.explainer',
    });

    expect(prisma.guidanceState.upsert).toHaveBeenCalledTimes(1);

    const upsertCall = prisma.guidanceState.upsert.mock.calls[0][0];

    expect(upsertCall.update.dismissedTipIds).toEqual([
      'calendar.overdue.explainer',
    ]);
  });

  it('will reset tips that are dismissed', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.guidanceState.findUnique.mockResolvedValue({
      walkthroughStatus: GuidanceWalkthroughStatus.NOT_STARTED,
      walkthroughStep: 0,
      dismissedTipIds: ['calendar.overdue.explainer'],
    });

    prisma.guidanceState.upsert.mockResolvedValue({
      tipsEnabled: true,
      dailyExpansionEnabled: true,
      walkthroughStatus: GuidanceWalkthroughStatus.NOT_STARTED,
      walkthroughStep: 0,
      dismissedTipIds: [],
      updatedAt: new Date(),
    });

    await service.updateState(authUser, {
      resetDismissedTips: true,
    });

    expect(prisma.guidanceState.upsert).toHaveBeenCalledTimes(1);

    const upsertCall = prisma.guidanceState.upsert.mock.calls[0][0];

    expect(upsertCall.update.dismissedTipIds).toEqual([]);
  });

  it('will reject a guidance tip id that is not allowed or listed', async () => {
    await expect(
      service.updateState(authUser, {
        dismissTipId: 'not-real-tip-id',
      }),
    ).rejects.toThrow('Unknown guidance tip id');

    expect(prisma.guidanceState.upsert).not.toHaveBeenCalled();
  });

  it('will reject an empty guidance state update', async () => {
    await expect(service.updateState(authUser, {})).rejects.toThrow(
      'Guidance state cannot be empty',
    );

    expect(usersService.findOrCreateUser).not.toHaveBeenCalled();
  });

  it('will not add the same dismissed tip id twice', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.guidanceState.findUnique.mockResolvedValue({
      walkthroughStatus: GuidanceWalkthroughStatus.NOT_STARTED,
      walkthroughStep: 0,
      dismissedTipIds: ['calendar.overdue.explainer'],
    });

    prisma.guidanceState.upsert.mockResolvedValue({
      tipsEnabled: true,
      dailyExpansionEnabled: true,
      walkthroughStatus: GuidanceWalkthroughStatus.NOT_STARTED,
      walkthroughStep: 0,
      dismissedTipIds: ['calendar.overdue.explainer'],
      updatedAt: new Date(),
    });

    await service.updateState(authUser, {
      dismissTipId: 'calendar.overdue.explainer',
    });

    const upsertCall = prisma.guidanceState.upsert.mock.calls[0][0];

    expect(upsertCall.update.dismissedTipIds).toEqual([
      'calendar.overdue.explainer',
    ]);
  });

  it('will reject replay with a nonzero walkthrough step', async () => {
    await expect(
      service.updateState(authUser, {
        replayWalkthrough: true,
        walkthrough: {
          currentStep: 3,
        },
      }),
    ).rejects.toThrow(
      'Walkthrough replay cannot be combined with a nonzero step',
    );

    expect(prisma.guidanceState.upsert).not.toHaveBeenCalled();
  });

  it('will reject replay with a walkthrough status that is conflicting', async () => {
    await expect(
      service.updateState(authUser, {
        replayWalkthrough: true,
        walkthrough: {
          status: GuidanceWalkthroughStatus.COMPLETED,
        },
      }),
    ).rejects.toThrow(
      'Walkthrough replay cannot be with a status that is conflicting',
    );

    expect(prisma.guidanceState.upsert).not.toHaveBeenCalled();
  });

  it('will read daily quiz facts using the Johannesburg local day', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.quizSession.findFirst.mockResolvedValue(null);
    prisma.gamificationProfile.findUnique.mockResolvedValue(null);

    const now = new Date('2026-09-20T22:30:00.000Z');

    await service.getDailyFacts(authUser, now);

    expect(prisma.quizSession.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        type: QuizSessionType.DAILY,
        quizDate: {
          gte: new Date('2026-09-20T22:00:00.000Z'),
          lt: new Date('2026-09-21T22:00:00.000Z'),
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      select: {
        id: true,
        status: true,
        score: true,
        totalQuestions: true,
        startedAt: true,
        completedAt: true,
        coinsAwarded: true,
        xpAwarded: true,
      },
    });
  });

  it('will return the current streaksfor the gamification profile', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.quizSession.findFirst.mockResolvedValue(null);

    prisma.gamificationProfile.findUnique.mockResolvedValue({
      currentPaymentStreak: 4,
      currentKnowledgeStreak: 8,
    });

    const result = await service.getDailyFacts(authUser);

    expect(result.streaks).toEqual({
      payment: 4,
      knowledge: 8,
    });
  });

  it('will return the current daily quiz state', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    const startedAt = new Date('2026-09-20T08:00:00.000Z');

    prisma.quizSession.findFirst.mockResolvedValue({
      id: 'quiz-1',
      status: 'IN_PROGRESS',
      score: 3,
      totalQuestions: 5,
      startedAt,
      completedAt: null,
      coinsAwarded: 0,
      xpAwarded: 0,
    });

    prisma.gamificationProfile.findUnique.mockResolvedValue({
      currentPaymentStreak: 3,
      currentKnowledgeStreak: 2,
    });

    const result = await service.getDailyFacts(
      authUser,
      new Date('2026-09-20T10:00:00.000Z'),
    );

    expect(result.dailyQuiz).toEqual({
      status: 'IN_PROGRESS',
      sessionId: 'quiz-1',
      canStart: false,
      canResume: true,
    });
  });

  it('will return the completed daily quiz state', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    const startedAt = new Date('2026-09-20T08:00:00.000Z');

    prisma.quizSession.findFirst.mockResolvedValue({
      id: 'quiz-1',
      status: 'COMPLETED',
      score: 5,
      totalQuestions: 5,
      startedAt,
      completedAt: null,
      coinsAwarded: 0,
      xpAwarded: 0,
    });

    prisma.gamificationProfile.findUnique.mockResolvedValue({
      currentPaymentStreak: 3,
      currentKnowledgeStreak: 2,
    });

    const result = await service.getDailyFacts(
      authUser,
      new Date('2026-09-20T10:00:00.000Z'),
    );

    expect(result.dailyQuiz).toEqual({
      status: 'COMPLETED',
      sessionId: 'quiz-1',
      canStart: false,
      canResume: false,
    });
  });

  it('will return valid empty daily facts for when there is no activity', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.quizSession.findFirst.mockResolvedValue(null);
    prisma.gamificationProfile.findUnique.mockResolvedValue(null);

    const result = await service.getDailyFacts(
      authUser,
      new Date('2026-09-20T10:00:00.000Z'),
    );

    expect(result.dailyQuiz).toEqual({
      status: 'UNAVAILABLE',
      sessionId: null,
      canStart: false,
      canResume: false,
    });

    expect(result.streaks).toEqual({
      payment: 0,
      knowledge: 0,
    });

    expect(result.payments).toEqual({
      contributionCount: 0,
      completedOccurrenceCount: 0,
      totalsByCurrency: [],
    });
  });

  it('will total partial and final payment contribution without counting it twice', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.paymentContribution.findMany.mockResolvedValue([
      {
        amount: 50,
        currency: 'ZAR',
        occurrenceId: 'occurrence-1',
        occurrence: {
          status: PaymentOccurrenceStatus.PAID,
        },
      },
      {
        amount: 100,
        currency: 'ZAR',
        occurrenceId: 'occurrence-1',
        occurrence: {
          status: PaymentOccurrenceStatus.PAID,
        },
      },
    ]);

    prisma.quizSession.findFirst.mockResolvedValue(null);
    prisma.gamificationProfile.findUnique.mockResolvedValue(null);

    const result = await service.getDailyFacts(
      authUser,
      new Date('2026-09-20T10:00:00.000Z'),
    );

    expect(result.payments).toEqual({
      contributionCount: 2,
      completedOccurrenceCount: 1,
      totalsByCurrency: [
        {
          currency: 'ZAR',
          amount: '150.00',
        },
      ],
    });
  });

  it('will exclude payment contributions that are voided', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.paymentContribution.findMany.mockResolvedValue([
      {
        amount: 50,
        currency: 'ZAR',
        occurrenceId: 'occurrence-1',
        occurrence: {
          status: PaymentOccurrenceStatus.PARTIALLY_PAID,
        },
      },
    ]);

    prisma.quizSession.findFirst.mockResolvedValue(null);
    prisma.gamificationProfile.findUnique.mockResolvedValue(null);

    await service.getDailyFacts(authUser, new Date('2026-09-20T10:00:00.000Z'));

    expect(prisma.paymentContribution.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        state: PaymentContributionState.POSTED,
        createdAt: {
          gte: expect.any(Date) as Date,
          lt: expect.any(Date) as Date,
        },
      },
      select: {
        amount: true,
        currency: true,
        occurrenceId: true,
        occurrence: {
          select: {
            status: true,
          },
        },
      },
    });
  });

  it('will group payment totals by currency', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.paymentContribution.findMany.mockResolvedValue([
      {
        amount: 50,
        currency: 'ZAR',
        occurrenceId: 'occurrence-1',
        occurrence: {
          status: PaymentOccurrenceStatus.PARTIALLY_PAID,
        },
      },
      {
        amount: 50,
        currency: 'ZAR',
        occurrenceId: 'occurrence-2',
        occurrence: {
          status: PaymentOccurrenceStatus.PAID,
        },
      },
      {
        currency: 'USD',
        amount: '35.00',
        occurrenceId: 'occurrence-3',
        occurrence: {
          status: PaymentOccurrenceStatus.PAID,
        },
      },
    ]);

    prisma.quizSession.findFirst.mockResolvedValue(null);
    prisma.gamificationProfile.findUnique.mockResolvedValue(null);

    const result = await service.getDailyFacts(
      authUser,
      new Date('2026-09-20T10:00:00.000Z'),
    );

    expect(result.payments).toEqual({
      contributionCount: 3,
      completedOccurrenceCount: 2,
      totalsByCurrency: [
        {
          currency: 'ZAR',
          amount: '100.00',
        },
        {
          currency: 'USD',
          amount: '35.00',
        },
      ],
    });
  });

  it('will return unavailable when daily facts cannot be read safely', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.paymentContribution.findMany.mockRejectedValue('database failure');

    prisma.quizSession.findFirst.mockResolvedValue(null);

    prisma.gamificationProfile.findUnique.mockResolvedValue({
      currentPaymentStreak: 2,
      currentKnowledgeStreak: 3,
    });

    await expect(service.getDailyFacts(authUser)).rejects.toThrow(
      'Daily guidance facts are unavailable',
    );
  });

  it('will not read guidance state for an account that is inactive', async () => {
    usersService.findOrCreateUser.mockRejectedValue(
      new UnauthorizedException('User account is deactivated'),
    );

    await expect(service.getState(authUser)).rejects.toThrow(
      'User account is deactivated',
    );

    expect(prisma.guidanceState.findUnique).not.toHaveBeenCalled();
  });

  it('will read guidance state for the authenticated user', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'authenticated-user',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.guidanceState.findUnique.mockResolvedValue(null);

    await service.getState(authUser);

    expect(prisma.guidanceState.findUnique).toHaveBeenCalledWith({
      where: {
        userId: 'authenticated-user',
      },
    });
  });

  it('will save a walkthrough that was skipped', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.guidanceState.findUnique.mockResolvedValue({
      walkthroughStatus: GuidanceWalkthroughStatus.IN_PROGRESS,
      walkthroughStep: 1,
      dismissedTipIds: [],
    });

    prisma.guidanceState.upsert.mockResolvedValue({
      tipsEnabled: true,
      dailyExpansionEnabled: true,
      walkthroughStatus: GuidanceWalkthroughStatus.SKIPPED,
      walkthroughStep: 1,
      dismissedTipIds: [],
      updatedAt: new Date(),
    });

    await service.updateState(authUser, {
      walkthrough: {
        status: GuidanceWalkthroughStatus.SKIPPED,
      },
    });

    const upsertCall = prisma.guidanceState.upsert.mock.calls[0][0];

    expect(upsertCall.update.walkthroughStatus).toBe(
      GuidanceWalkthroughStatus.SKIPPED,
    );
    expect(upsertCall.update.walkthroughStep).toBe(1);
  });

  it('will save a walkthrough that is in progress', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.guidanceState.findUnique.mockResolvedValue(null);

    prisma.guidanceState.upsert.mockResolvedValue({
      tipsEnabled: true,
      dailyExpansionEnabled: true,
      walkthroughStatus: GuidanceWalkthroughStatus.IN_PROGRESS,
      walkthroughStep: 3,
      dismissedTipIds: [],
      updatedAt: new Date(),
    });

    await service.updateState(authUser, {
      walkthrough: {
        status: GuidanceWalkthroughStatus.IN_PROGRESS,
        currentStep: 3,
      },
    });

    expect(prisma.guidanceState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          walkthroughStatus: GuidanceWalkthroughStatus.IN_PROGRESS,
          walkthroughStep: 3,
        }) as unknown,
        update: expect.objectContaining({
          walkthroughStatus: GuidanceWalkthroughStatus.IN_PROGRESS,
          walkthroughStep: 3,
        }) as unknown,
      }),
    );
  });

  it('will resume walkthrough from the state that was saved', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.guidanceState.findUnique.mockResolvedValue({
      walkthroughStatus: GuidanceWalkthroughStatus.IN_PROGRESS,
      walkthroughStep: 1,
      dismissedTipIds: [],
    });

    prisma.guidanceState.upsert.mockResolvedValue({
      tipsEnabled: true,
      dailyExpansionEnabled: true,
      walkthroughStatus: GuidanceWalkthroughStatus.IN_PROGRESS,
      walkthroughStep: 3,
      dismissedTipIds: [],
      updatedAt: new Date(),
    });

    await service.updateState(authUser, {
      walkthrough: {
        currentStep: 3,
      },
    });

    const upsertCall = prisma.guidanceState.upsert.mock.calls[0][0];

    expect(upsertCall.update.walkthroughStatus).toBe(
      GuidanceWalkthroughStatus.IN_PROGRESS,
    );
    expect(upsertCall.update.walkthroughStep).toBe(3);
  });

  it('will not any gamification or financial data of the user when reading the daily guidance', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.paymentContribution.findMany.mockResolvedValue([]);
    prisma.quizSession.findFirst.mockResolvedValue(null);
    prisma.gamificationProfile.findUnique.mockResolvedValue(null);

    await service.getDailyFacts(authUser, new Date('2026-09-20T10:00:00.000Z'));

    expect(prisma.paymentContribution.create).not.toHaveBeenCalled();
    expect(prisma.paymentContribution.update).not.toHaveBeenCalled();
    expect(prisma.paymentContribution.deleteMany).not.toHaveBeenCalled();
    expect(prisma.quizSession.update).not.toHaveBeenCalled();
    expect(prisma.gamificationProfile.update).not.toHaveBeenCalled();
    expect(prisma.rewardTransaction.create).not.toHaveBeenCalled();
    expect(prisma.userInventoryItem.update).not.toHaveBeenCalled();
  });
});
