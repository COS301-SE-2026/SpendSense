import { GuidanceWalkthroughStatus } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { UsersService } from '../users/users.service';
import { GuidanceService } from './guidance.service';

describe('GuidanceService', () => {
  let service: GuidanceService;

  let prisma: {
    guidanceState: {
      findUnique: jest.Mock;
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
});
