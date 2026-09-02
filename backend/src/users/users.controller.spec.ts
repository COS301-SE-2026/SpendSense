jest.mock('../auth/guards/supabase-jwt.guard', () => ({
  SupabaseJwtGuard: class SupabaseJwtGuard {},
}));

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import type { AuthUser } from '../auth/types/auth-user.type';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<
    Pick<
      UsersService,
      | 'findOrCreateUser'
      | 'updateProfile'
      | 'deactivateAccount'
      | 'deleteAllUserData'
      | 'exportUserData'
      | 'updatePreferences'
    >
  >;

  beforeEach(() => {
    usersService = {
      findOrCreateUser: jest.fn(),
      updateProfile: jest.fn(),
      deactivateAccount: jest.fn(),
      deleteAllUserData: jest.fn(),
      exportUserData: jest.fn(),
      updatePreferences: jest.fn(),
    };

    controller = new UsersController(usersService as unknown as UsersService);
  });

  it('returns the current user profile in the API response shape', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'test-supabase-user-1',
      email: 'test-user-1@example.com',
    };
    const createdAt = new Date('2026-05-19T10:00:00.000Z');

    usersService.findOrCreateUser.mockResolvedValue({
      id: 'usr_123',
      email: 'test-user-1@example.com',
      displayName: 'Kyle',
      avatarUrl: null,
      monthlyBudget: null,
      onboardingCompleted: false,
      createdAt,
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
        scoreTier: 'GOOD',
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
    } as never);

    await expect(controller.getMe(authUser)).resolves.toEqual({
      user: {
        id: 'usr_123',
        email: 'test-user-1@example.com',
        displayName: 'Kyle',
        avatarUrl: null,
        monthlyBudget: null,
        onboardingCompleted: false,
        createdAt,
      },
      preferences: {
        theme: 'SYSTEM',
        currency: 'ZAR',
        language: 'en',
        reducedMotion: false,
      },
      notificationPreferences: {
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
        scoreTier: 'GOOD',
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
    });

    expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
  });

  it('updates the authenticated user profile and returns the full profile shape', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'test-supabase-user-1',
      email: 'test-user-1@example.com',
    };
    const createdAt = new Date('2026-05-19T10:00:00.000Z');
    const updates = {
      displayName: 'Updated Kyle',
      avatarUrl: null,
      monthlyBudget: 2500.5,
      onboardingCompleted: true,
    };
    const updatedProfile = {
      id: 'usr_123',
      email: 'test-user-1@example.com',
      displayName: 'Updated Kyle',
      avatarUrl: null,
      monthlyBudget: 2500.5,
      onboardingCompleted: true,
      createdAt,
      preference: null,
      notificationPreference: null,
      creditProfile: null,
      gamificationProfile: null,
    } as never;

    usersService.updateProfile.mockResolvedValue(updatedProfile);

    await expect(controller.updateMe(authUser, updates)).resolves.toEqual({
      user: {
        id: 'usr_123',
        email: 'test-user-1@example.com',
        displayName: 'Updated Kyle',
        avatarUrl: null,
        monthlyBudget: 2500.5,
        onboardingCompleted: true,
        createdAt,
      },
      preferences: null,
      notificationPreferences: null,
      creditProfile: null,
      gamificationProfile: null,
    });

    expect(usersService.updateProfile).toHaveBeenCalledWith(authUser, updates);
  });

  it('deactivates the authenticated user account', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'test-supabase-user-1',
      email: 'test-user-1@example.com',
    };
    const deactivatedAt = new Date('2026-07-21T10:00:00.000Z');
    const result = { deactivated: true, deactivatedAt };

    usersService.deactivateAccount.mockResolvedValue(result);

    await expect(controller.deactivateMe(authUser)).resolves.toEqual(result);
    expect(usersService.deactivateAccount).toHaveBeenCalledWith(authUser);
  });

  it('exports data for the authenticated user', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'test-supabase-user-1',
      email: 'test-user-1@example.com',
    };
    const result = {
      exportedAt: new Date('2026-07-21T10:00:00.000Z'),
      user: { id: 'usr_123', email: authUser.email },
      preferences: {},
      notificationPreferences: {},
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

    usersService.exportUserData.mockResolvedValue(result as never);

    await expect(controller.exportMe(authUser)).resolves.toEqual(result);
    expect(usersService.exportUserData).toHaveBeenCalledWith(authUser);
  });

  it('delegates the POPIA deletion request for the authenticated user only', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'test-supabase-user-1',
      email: 'test-user-1@example.com',
    };
    const receipt = {
      deleted: true as const,
      deletedAt: new Date('2026-07-21T10:00:00.000Z'),
      recordsDeleted: { obligations: 4, user: 1 },
    };

    usersService.deleteAllUserData.mockResolvedValue(receipt);

    await expect(controller.deleteMyData(authUser)).resolves.toEqual(receipt);
    expect(usersService.deleteAllUserData).toHaveBeenCalledWith(authUser);
    expect(usersService.deactivateAccount).not.toHaveBeenCalled();
  });

  it('will update preferences and return the preferences response shape', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'test-supabase-user-1',
      email: 'test-user-1@example.com',
    };
    const updates = { theme: 'LIGHT', reducedMotion: true };
    const updatedPrefs = {
      theme: 'LIGHT',
      language: 'en',
      currency: 'ZAR',
      reducedMotion: true,
    };

    usersService.updatePreferences.mockResolvedValue(updatedPrefs);

    await expect(
      controller.updateMyPreferences(authUser, updates),
    ).resolves.toEqual({ preferences: updatedPrefs });

    expect(usersService.updatePreferences).toHaveBeenCalledWith(
      authUser,
      updates,
    );
  });
});
