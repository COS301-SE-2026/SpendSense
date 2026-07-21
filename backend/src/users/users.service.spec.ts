import { ScoreTier, UserEventSourceType, UserEventType } from '@prisma/client';
import { InternalUserProfile, UsersService } from './users.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import type { PrismaService } from '../prisma/prisma.service';

type UsersTransactionMock = {
  user: {
    create: jest.Mock<Promise<InternalUserProfile>, [unknown]>;
  };
  userEvent: {
    create: jest.Mock<Promise<unknown>, [unknown]>;
  };
};

type UsersTransactionCallback = (
  tx: UsersTransactionMock,
) => Promise<InternalUserProfile>;

type UsersPrismaMock = {
  user: {
    findUnique: jest.Mock<Promise<InternalUserProfile | null>, [unknown]>;
    update: jest.Mock<Promise<InternalUserProfile>, [unknown]>;
  };
  $transaction: jest.Mock<
    Promise<InternalUserProfile>,
    [UsersTransactionCallback]
  >;
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: UsersPrismaMock;

  const authUser: AuthUser = {
    supabaseAuthId: 'test-supabase-user-1',
    email: 'test-user-1@example.com',
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn<Promise<InternalUserProfile | null>, [unknown]>(),
        update: jest.fn<Promise<InternalUserProfile>, [unknown]>(),
      },
      $transaction: jest.fn<
        Promise<InternalUserProfile>,
        [UsersTransactionCallback]
      >(),
    };

    service = new UsersService(prisma as unknown as PrismaService);
  });

  it('returns the existing internal user profile when one already exists', async () => {
    const existingUser = {
      id: 'usr_existing',
      supabaseAuthId: 'test-supabase-user-1',
      email: 'test-user-1@example.com',
      monthlyBudget: null,
      createdAt: new Date('2026-05-01'),
      updatedAt: new Date('2026-05-01'),
      deletedAt: null,
      preference: {
        theme: 'SYSTEM',
        currency: 'ZAR',
        language: 'en',
        reducedMotion: false,
      },
      notificationPreference: {
        inAppEnabled: true,
        emailEnabled: true,
        pushEnabled: false,
        smsEnabled: false,
        defaultReminderDaysBefore: 3,
        quietHoursStart: null,
        quietHoursEnd: null,
      },
      creditProfile: {
        currentScore: 600,
        previousScore: 600,
        scoreTier: ScoreTier.GOOD,
        onTimePaymentCount: 0,
        latePaymentCount: 0,
        missedPaymentCount: 0,
        lastCalculatedAt: null,
      },
      gamificationProfile: {
        coinBalance: 0,
        xp: 0,
        mascotLevel: 1,
        mascotMood: 'NEUTRAL',
        currentPaymentStreak: 0,
        longestPaymentStreak: 0,
        currentKnowledgeStreak: 0,
        longestKnowledgeStreak: 0,
      },
    } as InternalUserProfile;

    prisma.user.findUnique.mockResolvedValue(existingUser);

    await expect(service.findOrCreateUser(authUser)).resolves.toBe(
      existingUser,
    );
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { supabaseAuthId: authUser.supabaseAuthId },
      }),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates the default internal user state and records the creation event on first request', async () => {
    const createdUser = {
      id: 'usr_new',
      supabaseAuthId: 'test-supabase-user-1',
      email: 'test-user-1@example.com',
      monthlyBudget: null,
      createdAt: new Date('2026-05-01'),
      updatedAt: new Date('2026-05-01'),
      deletedAt: null,
      preference: {
        theme: 'SYSTEM',
        currency: 'ZAR',
        language: 'en',
        reducedMotion: false,
      },
      notificationPreference: {
        inAppEnabled: true,
        emailEnabled: true,
        pushEnabled: false,
        smsEnabled: false,
        defaultReminderDaysBefore: 3,
        quietHoursStart: null,
        quietHoursEnd: null,
      },
      creditProfile: {
        currentScore: 600,
        previousScore: 600,
        scoreTier: ScoreTier.GOOD,
        onTimePaymentCount: 0,
        latePaymentCount: 0,
        missedPaymentCount: 0,
        lastCalculatedAt: null,
      },
      gamificationProfile: {
        coinBalance: 0,
        xp: 0,
        mascotLevel: 1,
        mascotMood: 'NEUTRAL',
        currentPaymentStreak: 0,
        longestPaymentStreak: 0,
        currentKnowledgeStreak: 0,
        longestKnowledgeStreak: 0,
      },
    } as InternalUserProfile;
    const tx = {
      user: {
        create: jest
          .fn<Promise<InternalUserProfile>, [unknown]>()
          .mockResolvedValue(createdUser),
      },
      userEvent: {
        create: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({
          id: 'ue_123',
        }),
      },
    };

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation((callback) => callback(tx));

    await expect(service.findOrCreateUser(authUser)).resolves.toBe(createdUser);

    expect(tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          supabaseAuthId: authUser.supabaseAuthId,
          email: authUser.email,
          preference: { create: {} },
          notificationPreference: { create: {} },
          creditProfile: {
            create: {
              currentScore: 600,
              previousScore: 600,
              scoreTier: ScoreTier.GOOD,
            },
          },
          gamificationProfile: { create: {} },
        }) as unknown,
      }),
    );
    expect(tx.userEvent.create).toHaveBeenCalledWith({
      data: {
        userId: createdUser.id,
        eventType: UserEventType.USER_CREATED,
        sourceType: UserEventSourceType.USER,
        sourceId: createdUser.id,
        metadata: {
          supabaseAuthId: authUser.supabaseAuthId,
        },
      },
    });
  });

  it('updates only the authenticated internal user row', async () => {
    const existingUser = {
      id: 'usr_authenticated',
      supabaseAuthId: authUser.supabaseAuthId,
    } as InternalUserProfile;
    const updatedUser = {
      ...existingUser,
      displayName: 'Updated Kyle',
      avatarUrl: null,
      monthlyBudget: 2500.5,
      onboardingCompleted: true,
    } as InternalUserProfile;
    const updates = {
      displayName: 'Updated Kyle',
      avatarUrl: null,
      monthlyBudget: 2500.5,
      onboardingCompleted: true,
    };

    prisma.user.findUnique.mockResolvedValue(existingUser);
    prisma.user.update.mockResolvedValue(updatedUser);

    await expect(service.updateProfile(authUser, updates)).resolves.toBe(
      updatedUser,
    );

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { supabaseAuthId: authUser.supabaseAuthId },
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: existingUser.id },
        data: updates,
      }),
    );
  });

  it('rejects an empty profile update', async () => {
    await expect(service.updateProfile(authUser, {})).rejects.toThrow(
      'At least one profile field is required',
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
