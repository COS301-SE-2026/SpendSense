import { ScoreTier, UserEventSourceType, UserEventType } from '@prisma/client';
import {
  InternalUserProfile,
  UsersService,
  UserPreferenceResult,
} from './users.service';
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
  userPreference: {
    upsert: jest.Mock<Promise<UserPreferenceResult>, [unknown]>;
  };
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
      userPreference: {
        upsert: jest.fn<Promise<UserPreferenceResult>, [unknown]>(),
      },
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

  it('turns duplicate display names into a conflict error', async () => {
    const existingUser = {
      id: 'usr_authenticated',
      supabaseAuthId: authUser.supabaseAuthId,
      deletedAt: null,
    } as InternalUserProfile;

    prisma.user.findUnique.mockResolvedValue(existingUser);
    prisma.user.update.mockRejectedValue({
      code: 'P2002',
      meta: { target: ['displayName'] },
    });

    await expect(
      service.updateProfile(authUser, { displayName: 'Taken Name' }),
    ).rejects.toThrow('Display name is already taken');
  });

  it('rejects a deactivated account during profile resolution', async () => {
    const deactivatedUser = {
      id: 'usr_deactivated',
      supabaseAuthId: authUser.supabaseAuthId,
      deletedAt: new Date('2026-07-21T10:00:00.000Z'),
    } as InternalUserProfile;

    prisma.user.findUnique.mockResolvedValue(deactivatedUser);

    await expect(service.findOrCreateUser(authUser)).rejects.toThrow(
      'User account is deactivated',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('soft-deactivates only the authenticated user account', async () => {
    const existingUser = {
      id: 'usr_authenticated',
      supabaseAuthId: authUser.supabaseAuthId,
      deletedAt: null,
    } as InternalUserProfile;
    prisma.user.findUnique.mockResolvedValue(existingUser);
    prisma.user.update.mockResolvedValue({
      ...existingUser,
      deletedAt: new Date('2026-07-21T10:00:00.000Z'),
    });

    const result = await service.deactivateAccount(authUser);

    expect(result.deactivated).toBe(true);
    expect(result.deactivatedAt).toBeInstanceOf(Date);
    const updateCall = prisma.user.update.mock.calls[0]?.[0] as
      | {
          where: { id: string };
          data: { deletedAt: unknown };
        }
      | undefined;

    expect(updateCall?.where).toEqual({ id: existingUser.id });
    expect(updateCall?.data.deletedAt).toBeInstanceOf(Date);
  });

  it('exports only the authenticated user data without writing to the database', async () => {
    const identity = {
      id: 'usr_authenticated',
      deletedAt: null,
    } as InternalUserProfile;
    const exportedUser = {
      id: identity.id,
      email: authUser.email,
      displayName: 'Test User',
      avatarUrl: null,
      monthlyBudget: null,
      onboardingCompleted: true,
      preference: {},
      notificationPreference: {},
      creditProfile: {},
      gamificationProfile: {},
      obligations: [],
      paymentOccurrences: [],
      paymentRecords: [],
      reminders: [],
      notifications: [],
      scoreEvents: [],
      badges: [],
      userEvents: [],
      rewardTransactions: [],
      quizSessions: [],
    };

    prisma.user.findUnique
      .mockResolvedValueOnce(identity)
      .mockResolvedValueOnce(exportedUser as InternalUserProfile);

    const result = await service.exportUserData(authUser);

    expect(result.exportedAt).toBeInstanceOf(Date);
    expect(result.user.id).toBe(identity.id);
    expect(result.user.email).toBe(authUser.email);
    expect(result.preferences).toBeDefined();
    expect(result.notificationPreferences).toBeDefined();
    expect(result.obligations).toEqual([]);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
  });

  it('will reject empty preferences update', async () => {
    await expect(service.updatePreferences(authUser, {})).rejects.toThrow(
      'At least one field for preferences is required',
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.userPreference.upsert).not.toHaveBeenCalled();
  });

  it('will upsert preferences for an authenticated user', async () => {
    const existingUser = {
      id: 'auth-user-1',
      supabaseAuthId: authUser.supabaseAuthId,
    } as InternalUserProfile;
    const updates = { theme: 'LIGHT', reducedMotion: true };
    const updatedPrefs = {
      theme: 'LIGHT',
      language: 'en',
      currency: 'ZAR',
      reducedMotion: true,
    } as UserPreferenceResult;

    prisma.user.findUnique.mockResolvedValue(existingUser);
    prisma.userPreference.upsert.mockResolvedValue(updatedPrefs);

    await expect(service.updatePreferences(authUser, updates)).resolves.toBe(
      updatedPrefs,
    );

    expect(prisma.userPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: existingUser.id },
        update: updates,
      }),
    );
  });

  it('will fall back to schemas defaults when making a missing preference row', async () => {
    const existingUser = {
      id: 'auth-user-1',
      supabaseAuthId: authUser.supabaseAuthId,
    } as InternalUserProfile;
    const updatedPrefs = {
      theme: 'SYSTEM',
      language: 'en',
      currency: 'ZAR',
      reducedMotion: false,
    } as UserPreferenceResult;

    prisma.user.findUnique.mockResolvedValue(existingUser);
    prisma.userPreference.upsert.mockResolvedValue(updatedPrefs);

    await service.updatePreferences(authUser, { reducedMotion: false });

    expect(prisma.userPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: existingUser.id,
          theme: 'SYSTEM',
          language: 'en',
          currency: 'ZAR',
          reducedMotion: false,
        }) as unknown,
      }),
    );
  });
});

const DELETE_MANY_MODELS = [
  'scoreEvent',
  'reminder',
  'paymentRecord',
  'paymentOccurrence',
  'paymentSchedule',
  'financialObligation',
  'notification',
  'rewardTransaction',
  'userEvent',
  'userBadge',
  'quizSessionAnswer',
  'quizSession',
  'userInventoryItem',
  'creditProfile',
  'gamificationProfile',
  'notificationPreference',
  'userPreference',
] as const;

type DeletionModel = (typeof DELETE_MANY_MODELS)[number];

type DeletionTx = Record<
  DeletionModel,
  { deleteMany: jest.Mock<Promise<{ count: number }>, [{ where: unknown }]> }
> & {
  user: { delete: jest.Mock<Promise<unknown>, [{ where: { id: string } }]> };
};

describe('UsersService data deletion', () => {
  let service: UsersService;
  let prisma: {
    user: { findUnique: jest.Mock<Promise<unknown>, [unknown]> };
    $transaction: jest.Mock<
      Promise<unknown>,
      [(tx: DeletionTx) => Promise<unknown>]
    >;
  };
  let tx: DeletionTx;
  let callOrder: string[];
  let whereByModel: Partial<Record<string, unknown>>;

  const authUser: AuthUser = {
    supabaseAuthId: 'test-supabase-user-1',
    email: 'test-user-1@example.com',
  };

  const userId = 'usr_authenticated';

  beforeEach(() => {
    callOrder = [];
    whereByModel = {};

    tx = {
      user: {
        delete: jest.fn((args: { where: { id: string } }) => {
          callOrder.push('user.delete');
          whereByModel['user.delete'] = args.where;
          return Promise.resolve({});
        }),
      },
    } as DeletionTx;

    DELETE_MANY_MODELS.forEach((model, index) => {
      tx[model] = {
        deleteMany: jest.fn((args: { where: unknown }) => {
          callOrder.push(model);
          whereByModel[model] = args.where;
          // distinct counts so the receipt cannot pass by coincidence
          return Promise.resolve({ count: index + 1 });
        }),
      };
    });

    prisma = {
      user: { findUnique: jest.fn<Promise<unknown>, [unknown]>() },
      $transaction: jest.fn((callback: (t: DeletionTx) => Promise<unknown>) =>
        callback(tx),
      ),
    };

    service = new UsersService(prisma as unknown as PrismaService);
  });

  it('deletes every user-owned table and the user record itself', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });

    await service.deleteAllUserData(authUser);

    DELETE_MANY_MODELS.forEach((model) => {
      expect(tx[model].deleteMany).toHaveBeenCalledTimes(1);
    });
    expect(tx.user.delete).toHaveBeenCalledTimes(1);
    expect(whereByModel['user.delete']).toEqual({ id: userId });
  });

  it('scopes every delete to the authenticated user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });

    await service.deleteAllUserData(authUser);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { supabaseAuthId: authUser.supabaseAuthId },
      select: { id: true },
    });

    expect(whereByModel.paymentSchedule).toEqual({ obligation: { userId } });
    expect(whereByModel.quizSessionAnswer).toEqual({ session: { userId } });

    DELETE_MANY_MODELS.filter(
      (model) => model !== 'paymentSchedule' && model !== 'quizSessionAnswer',
    ).forEach((model) => {
      expect(whereByModel[model]).toEqual({ userId });
    });
  });

  it('deletes restricted children before their parents', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });

    await service.deleteAllUserData(authUser);

    const before = (child: string, parent: string) => {
      expect(callOrder.indexOf(child)).toBeGreaterThanOrEqual(0);
      expect(callOrder.indexOf(parent)).toBeGreaterThanOrEqual(0);
      expect(callOrder.indexOf(child)).toBeLessThan(callOrder.indexOf(parent));
    };

    before('scoreEvent', 'creditProfile');
    before('scoreEvent', 'paymentRecord');
    before('reminder', 'paymentOccurrence');
    before('paymentRecord', 'paymentOccurrence');
    before('paymentOccurrence', 'paymentSchedule');
    before('paymentSchedule', 'financialObligation');
    before('rewardTransaction', 'userEvent');
    before('quizSessionAnswer', 'quizSession');

    expect(callOrder[callOrder.length - 1]).toBe('user.delete');
  });

  it('runs the whole erasure in a single transaction', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });

    await service.deleteAllUserData(authUser);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('returns a per-table receipt of what was destroyed', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });

    const result = await service.deleteAllUserData(authUser);

    expect(result.deleted).toBe(true);
    expect(result.deletedAt).toBeInstanceOf(Date);
    expect(result.recordsDeleted.scoreEvents).toBe(1);
    expect(result.recordsDeleted.preference).toBe(DELETE_MANY_MODELS.length);
    expect(result.recordsDeleted.user).toBe(1);
  });

  it('leaves shared reference data untouched', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });

    await service.deleteAllUserData(authUser);

    ['category', 'badgeDefinition', 'quizQuestion', 'cosmeticItem'].forEach(
      (model) => {
        expect(callOrder).not.toContain(model);
      },
    );
  });

  it('writes no audit event that would recreate the deleted personal data', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });

    await service.deleteAllUserData(authUser);

    expect(tx.userEvent.deleteMany).toHaveBeenCalledTimes(1);
    expect(
      (tx as unknown as { userEvent: { create?: jest.Mock } }).userEvent.create,
    ).toBeUndefined();
  });

  it('still erases an account that was deactivated first', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });

    await expect(service.deleteAllUserData(authUser)).resolves.toEqual(
      expect.objectContaining({ deleted: true }),
    );
  });

  it('rejects deletion when no user exists for the identity', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.deleteAllUserData(authUser)).rejects.toThrow(
      'User account was not found',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
