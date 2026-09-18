import { GuidanceWalkthroughStatus } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { UsersService } from '../users/users.service';
import { GuidanceService } from './guidance.service';

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
      dismissedTipIds: ['dashboard.daily'],
    });

    prisma.guidanceState.upsert.mockResolvedValue({
      tipsEnabled: true,
      dailyExpansionEnabled: true,
      walkthroughStatus: GuidanceWalkthroughStatus.NOT_STARTED,
      walkthroughStep: 0,
      dismissedTipIds: ['dashboard.daily', 'calendar.overdue.explainer'],
      updatedAt: new Date(),
    });

    await service.updateState(authUser, {
      dismissTipId: 'calendar.overdue.explainer',
    });

    expect(prisma.guidanceState.upsert).toHaveBeenCalledTimes(1);

    const upsertCall = prisma.guidanceState.upsert.mock.calls[0][0];

    expect(upsertCall.update.dismissedTipIds).toEqual([
      'dashboard.daily',
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
      dismissedTipIds: ['dashboard.daily'],
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
});
