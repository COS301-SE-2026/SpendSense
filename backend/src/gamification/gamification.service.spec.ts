import { BadgeCategory, MascotMood } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import type { UsersService } from '../users/users.service';
import { GamificationService } from './gamification.service';

describe('GamificationService', () => {
  let service: GamificationService;
  let prisma: {
    gamificationProfile: {
      create: jest.Mock;
    };
    userBadge: {
      findMany: jest.Mock;
    };
    userInventoryItem: {
      findMany: jest.Mock;
    };
    userEvent: {
      findMany: jest.Mock;
    };
  };
  let usersService: jest.Mocked<Pick<UsersService, 'findOrCreateUser'>>;

  const authUser = {
    supabaseAuthId: 'test-supabase-user-1',
    email: 'test-user-1@example.com',
  };

  beforeEach(() => {
    prisma = {
      gamificationProfile: {
        create: jest.fn(),
      },
      userBadge: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      userInventoryItem: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      userEvent: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    usersService = {
      findOrCreateUser: jest.fn(),
    };

    service = new GamificationService(
      prisma as unknown as PrismaService,
      usersService as unknown as UsersService,
    );
  });

  it('returns the current gamification profile with integration contract field names', async () => {
    const earnedAt = new Date('2026-05-18T09:00:00.000Z');

    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
      gamificationProfile: {
        coinBalance: 145,
        xp: 320,
        mascotLevel: 2,
        mascotMood: MascotMood.HAPPY,
        currentPaymentStreak: 4,
        longestPaymentStreak: 6,
        currentKnowledgeStreak: 1,
        longestKnowledgeStreak: 3,
      },
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);
    prisma.userBadge.findMany.mockResolvedValue([
      {
        earnedAt,
        badgeDefinition: {
          code: 'FIRST_ON_TIME_PAYMENT',
          name: 'First On-Time Payment',
          description: 'Logged your first on-time payment.',
          category: BadgeCategory.PAYMENT,
          iconKey: 'badge-check',
        },
      },
    ]);

    await expect(service.getGamificationProfile(authUser)).resolves.toEqual({
      coins: 145,
      xp: 320,
      mascotLevel: 2,
      mascotMood: MascotMood.HAPPY,
      paymentStreak: 4,
      longestStreak: 6,
      knowledgeStreak: 1,
      longestKnowledgeStreak: 3,
      mascotLevelProgress: {
        currentLevelXp: 20,
        xpForNextLevel: 100,
        percentToNextLevel: 20,
      },
      moodReason: null,
      equippedCosmetics: [],
      badges: [
        {
          badgeKey: 'FIRST_ON_TIME_PAYMENT',
          name: 'First On-Time Payment',
          description: 'Logged your first on-time payment.',
          category: BadgeCategory.PAYMENT,
          iconKey: 'badge-check',
          earnedAt,
        },
      ],
    });
    expect(prisma.gamificationProfile.create).not.toHaveBeenCalled();
    expect(prisma.userBadge.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        earnedAt: {
          not: null,
        },
      },
      orderBy: {
        earnedAt: 'desc',
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
  });

  it('creates a default gamification profile when an existing user is missing one', async () => {
    const createdProfile = {
      coinBalance: 0,
      xp: 0,
      mascotLevel: 1,
      mascotMood: MascotMood.NEUTRAL,
      currentPaymentStreak: 0,
      longestPaymentStreak: 0,
      currentKnowledgeStreak: 0,
      longestKnowledgeStreak: 0,
    };

    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
      gamificationProfile: null,
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);
    prisma.gamificationProfile.create.mockResolvedValue(createdProfile);

    await expect(service.getGamificationProfile(authUser)).resolves.toEqual({
      coins: 0,
      xp: 0,
      mascotLevel: 1,
      mascotMood: MascotMood.NEUTRAL,
      paymentStreak: 0,
      longestStreak: 0,
      knowledgeStreak: 0,
      longestKnowledgeStreak: 0,
      mascotLevelProgress: {
        currentLevelXp: 0,
        xpForNextLevel: 100,
        percentToNextLevel: 0,
      },
      moodReason: null,
      equippedCosmetics: [],
      badges: [],
    });
    expect(prisma.gamificationProfile.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
      },
      select: {
        coinBalance: true,
        xp: true,
        mascotLevel: true,
        mascotMood: true,
        currentPaymentStreak: true,
        longestPaymentStreak: true,
        currentKnowledgeStreak: true,
        longestKnowledgeStreak: true,
      },
    });
  });

  it('will reset mascot level progress at 100xp', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
      gamificationProfile: {
        coinBalance: 100,
        xp: 200,
        mascotLevel: 3,
        mascotMood: MascotMood.HAPPY,
        currentPaymentStreak: 4,
        longestPaymentStreak: 6,
        currentKnowledgeStreak: 1,
        longestKnowledgeStreak: 3,
      },
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    const result = await service.getGamificationProfile(authUser);

    expect(result.mascotLevelProgress).toEqual({
      currentLevelXp: 0,
      xpForNextLevel: 100,
      percentToNextLevel: 0,
    });
  });

  it('will return the users equipped cosmetics', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
      gamificationProfile: {
        coinBalance: 145,
        xp: 320,
        mascotLevel: 3,
        mascotMood: MascotMood.HAPPY,
        currentPaymentStreak: 4,
        longestPaymentStreak: 6,
        currentKnowledgeStreak: 1,
        longestKnowledgeStreak: 3,
      },
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.userInventoryItem.findMany.mockResolvedValue([
      {
        cosmeticItem: {
          slot: 'HAT',
          code: 'party_hat',
          iconKey: 'hat_party',
        },
      },
      {
        cosmeticItem: {
          slot: 'ACCESSORY',
          code: 'medal',
          iconKey: 'medal',
        },
      },
    ]);

    const result = await service.getGamificationProfile(authUser);

    expect(result.equippedCosmetics).toEqual([
      {
        slot: 'HAT',
        code: 'party_hat',
        iconKey: 'hat_party',
      },
      {
        slot: 'ACCESSORY',
        code: 'medal',
        iconKey: 'medal',
      },
    ]);

    expect(prisma.userInventoryItem.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        equipped: true,
        cosmeticItem: {
          isActive: true,
        },
      },
      include: {
        cosmeticItem: {
          select: {
            slot: true,
            code: true,
            iconKey: true,
          },
        },
      },
    });
  });

  it('will return the reason for the mascots mood', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
      gamificationProfile: {
        coinBalance: 145,
        xp: 320,
        mascotLevel: 3,
        mascotMood: MascotMood.CELEBRATING,
        currentPaymentStreak: 4,
        longestPaymentStreak: 6,
        currentKnowledgeStreak: 1,
        longestKnowledgeStreak: 3,
      },
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.userEvent.findMany.mockResolvedValue([
      {
        metadata: {
          mascotMood: MascotMood.CELEBRATING,
          moodReason: 'Earned the First On-Time Payment badge',
        },
      },
    ]);

    const result = await service.getGamificationProfile(authUser);

    expect(result.moodReason).toBe('Earned the First On-Time Payment badge');
  });

  it('will return a mood reason of null after it has decayed back to NEUTRAL', async () => {
    usersService.findOrCreateUser.mockResolvedValue({
      id: 'user-1',
      gamificationProfile: {
        coinBalance: 145,
        xp: 320,
        mascotLevel: 1,
        mascotMood: MascotMood.NEUTRAL,
        currentPaymentStreak: 4,
        longestPaymentStreak: 6,
        currentKnowledgeStreak: 1,
        longestKnowledgeStreak: 3,
      },
    } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

    prisma.userEvent.findMany.mockResolvedValue([
      {
        metadata: {
          mascotMood: MascotMood.HAPPY,
          moodReason: 'Quiz completed',
        },
      },
    ]);

    const result = await service.getGamificationProfile(authUser);

    expect(result.moodReason).toBeNull();
  });
});
