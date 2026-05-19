import {
  ScoreTier,
  UserEventSourceType,
  UserEventType,
} from '@prisma/client';
import { UsersService } from './users.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import type { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const authUser: AuthUser = {
    supabaseAuthId: 'test-supabase-user-1',
    email: 'test-user-1@example.com',
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    service = new UsersService(prisma as unknown as PrismaService);
  });

  it('returns the existing internal user profile when one already exists', async () => {
    const existingUser = {
      id: 'usr_existing',
      email: 'test-user-1@example.com',
      preference: { theme: 'SYSTEM' },
      notificationPreference: { inAppEnabled: true },
      creditProfile: { currentScore: 600, scoreTier: ScoreTier.GOOD },
      gamificationProfile: { coinBalance: 0, mascotMood: 'NEUTRAL' },
    };

    prisma.user.findUnique.mockResolvedValue(existingUser);

    await expect(service.findOrCreateUser(authUser)).resolves.toBe(existingUser);
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
      email: 'test-user-1@example.com',
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
    };
    const tx = {
      user: {
        create: jest.fn().mockResolvedValue(createdUser),
      },
      userEvent: {
        create: jest.fn().mockResolvedValue({
          id: 'ue_123',
        }),
      },
    };

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));

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
        }),
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
});
