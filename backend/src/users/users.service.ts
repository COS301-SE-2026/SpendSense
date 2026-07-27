import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Prisma,
  ScoreTier,
  UserEventSourceType,
  UserEventType,
  Theme,
  Currency,
} from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';

// UsersService: manages internal user records
// bridges supabaseAuthId with the internal user table & default related records
const userProfileInclude = {
  preference: {
    select: {
      theme: true,
      currency: true,
      language: true,
      reducedMotion: true,
    },
  },
  notificationPreference: {
    select: {
      inAppEnabled: true,
      emailEnabled: true,
      pushEnabled: true,
      smsEnabled: true,
      defaultReminderDaysBefore: true,
      quietHoursStart: true,
      quietHoursEnd: true,
    },
  },
  creditProfile: {
    select: {
      currentScore: true,
      previousScore: true,
      scoreTier: true,
      onTimePaymentCount: true,
      latePaymentCount: true,
      missedPaymentCount: true,
      lastCalculatedAt: true,
    },
  },
  gamificationProfile: {
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
  },
} satisfies Prisma.UserInclude;

const userExportSelect = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  monthlyBudget: true,
  onboardingCompleted: true,
  createdAt: true,
  updatedAt: true,
  preference: {
    select: {
      theme: true,
      currency: true,
      language: true,
      reducedMotion: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  notificationPreference: {
    select: {
      inAppEnabled: true,
      emailEnabled: true,
      pushEnabled: true,
      smsEnabled: true,
      defaultReminderDaysBefore: true,
      quietHoursStart: true,
      quietHoursEnd: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  creditProfile: {
    select: {
      currentScore: true,
      previousScore: true,
      scoreTier: true,
      onTimePaymentCount: true,
      latePaymentCount: true,
      missedPaymentCount: true,
      currentUtilisationScore: true,
      lastCalculatedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  gamificationProfile: {
    select: {
      coinBalance: true,
      xp: true,
      mascotLevel: true,
      mascotMood: true,
      currentPaymentStreak: true,
      longestPaymentStreak: true,
      currentKnowledgeStreak: true,
      longestKnowledgeStreak: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  obligations: {
    where: { deletedAt: null },
    select: {
      id: true,
      categoryId: true,
      name: true,
      description: true,
      type: true,
      status: true,
      amount: true,
      currency: true,
      priority: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      updatedAt: true,
      category: {
        select: { id: true, name: true, type: true },
      },
      schedules: {
        where: { deletedAt: null },
        select: {
          id: true,
          frequency: true,
          interval: true,
          dayOfMonth: true,
          dayOfWeek: true,
          startDate: true,
          endDate: true,
          totalOccurrences: true,
          isActive: true,
        },
      },
    },
  },
  paymentOccurrences: {
    where: { deletedAt: null },
    select: {
      id: true,
      obligationId: true,
      scheduleId: true,
      dueDate: true,
      amountDue: true,
      currency: true,
      status: true,
      sequenceNumber: true,
      paidAt: true,
      overdueAt: true,
      missedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  paymentRecords: {
    where: { deletedAt: null },
    select: {
      id: true,
      occurrenceId: true,
      obligationId: true,
      amountPaid: true,
      currency: true,
      paidDate: true,
      paymentStatus: true,
      daysLate: true,
      simulatedInterest: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  reminders: {
    where: { deletedAt: null },
    select: {
      id: true,
      occurrenceId: true,
      channel: true,
      scheduledFor: true,
      sentAt: true,
      status: true,
      priority: true,
      message: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  notifications: {
    where: { deletedAt: null },
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      sourceType: true,
      sourceId: true,
      readAt: true,
      createdAt: true,
    },
  },
  scoreEvents: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      creditProfileId: true,
      occurrenceId: true,
      paymentRecordId: true,
      eventType: true,
      pointsDelta: true,
      scoreBefore: true,
      scoreAfter: true,
      explanation: true,
      calculationMetadata: true,
      createdAt: true,
    },
  },
  badges: {
    select: {
      id: true,
      progress: true,
      earnedAt: true,
      metadata: true,
      createdAt: true,
      badgeDefinition: {
        select: {
          code: true,
          name: true,
          description: true,
          category: true,
          criteriaType: true,
          criteriaValue: true,
          iconKey: true,
        },
      },
    },
  },
  userEvents: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      eventType: true,
      sourceType: true,
      sourceId: true,
      metadata: true,
      createdAt: true,
    },
  },
  rewardTransactions: {
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      sourceEventId: true,
      type: true,
      amount: true,
      balanceAfter: true,
      reason: true,
      createdAt: true,
    },
  },
  quizSessions: {
    orderBy: { startedAt: 'asc' },
    select: {
      id: true,
      type: true,
      topic: true,
      quizDate: true,
      status: true,
      startedAt: true,
      completedAt: true,
      score: true,
      totalQuestions: true,
      coinsAwarded: true,
      xpAwarded: true,
      answers: {
        orderBy: { answeredAt: 'asc' },
        select: {
          id: true,
          questionId: true,
          selectedOptionKey: true,
          isCorrect: true,
          attemptNumber: true,
          answeredAt: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

type UserExportData = Prisma.UserGetPayload<{
  select: typeof userExportSelect;
}>;

type UserExportResult = {
  exportedAt: Date;
  user: Omit<
    UserExportData,
    | 'preference'
    | 'notificationPreference'
    | 'creditProfile'
    | 'gamificationProfile'
    | 'obligations'
    | 'paymentOccurrences'
    | 'paymentRecords'
    | 'reminders'
    | 'notifications'
    | 'scoreEvents'
    | 'badges'
    | 'userEvents'
    | 'rewardTransactions'
    | 'quizSessions'
  >;
  preferences: UserExportData['preference'];
  notificationPreferences: UserExportData['notificationPreference'];
  creditProfile: UserExportData['creditProfile'];
  gamificationProfile: UserExportData['gamificationProfile'];
  obligations: UserExportData['obligations'];
  paymentOccurrences: UserExportData['paymentOccurrences'];
  paymentRecords: UserExportData['paymentRecords'];
  reminders: UserExportData['reminders'];
  notifications: UserExportData['notifications'];
  scoreEvents: UserExportData['scoreEvents'];
  badges: UserExportData['badges'];
  userEvents: UserExportData['userEvents'];
  rewardTransactions: UserExportData['rewardTransactions'];
  quizSessions: UserExportData['quizSessions'];
};

export type InternalUserProfile = Prisma.UserGetPayload<{
  include: typeof userProfileInclude;
}>;

export type UserPreferenceResult = Prisma.UserPreferenceGetPayload<{
  select: {
    theme: true;
    language: true;
    currency: true;
    reducedMotion: true;
  };
}>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // find/create the internal user for given supabase auth identity
  // on the first login, this creates User + UserPreference + NotificationPreference + CreditProfile + GamificationProfile in a single transactoin
  // returns the existing user on subsequent calls

  async findOrCreateUser(authUser: AuthUser): Promise<InternalUserProfile> {
    const { supabaseAuthId, email } = authUser;

    // fast path for if user already exists
    const existing = await this.prisma.user.findUnique({
      where: { supabaseAuthId },
      include: userProfileInclude,
    });

    if (existing) {
      if (existing.deletedAt) {
        throw new UnauthorizedException('User account is deactivated');
      }
      return existing;
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          supabaseAuthId,
          email: email ?? `${supabaseAuthId}@unknown.spendsense`,
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
        },
        include: userProfileInclude,
      });

      await tx.userEvent.create({
        data: {
          userId: user.id,
          eventType: UserEventType.USER_CREATED,
          sourceType: UserEventSourceType.USER,
          sourceId: user.id,
          metadata: {
            supabaseAuthId,
          },
        },
      });

      return user;
    });
  }

  async updateProfile(
    authUser: AuthUser,
    updates: UpdateProfileDto,
  ): Promise<InternalUserProfile> {
    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('At least one profile field is required');
    }

    const currentUser = await this.findOrCreateUser(authUser);

    return this.prisma.user.update({
      where: { id: currentUser.id },
      data: {
        ...(updates.displayName !== undefined && {
          displayName: updates.displayName,
        }),
        ...(updates.avatarUrl !== undefined && {
          avatarUrl: updates.avatarUrl,
        }),
        ...(updates.monthlyBudget !== undefined && {
          monthlyBudget: updates.monthlyBudget,
        }),
        ...(updates.onboardingCompleted !== undefined && {
          onboardingCompleted: updates.onboardingCompleted,
        }),
      },
      include: userProfileInclude,
    });
  }

  async updatePreferences(
    authUser: AuthUser,
    updates: UpdatePreferencesDto,
  ): Promise<UserPreferenceResult> {
    if (Object.keys(updates).length === 0) {
      throw new BadRequestException(
        'At least one field for preferences is required',
      );
    }

    const currentUser = await this.findOrCreateUser(authUser);

    return this.prisma.userPreference.upsert({
      where: { userId: currentUser.id },
      update: {
        ...(updates.theme !== undefined && { theme: updates.theme }),
        ...(updates.language !== undefined && { language: updates.language }),
        ...(updates.currency !== undefined && { currency: updates.currency }),
        ...(updates.reducedMotion !== undefined && {
          reducedMotion: updates.reducedMotion,
        }),
      },
      create: {
        userId: currentUser.id,
        theme: updates.theme ?? Theme.SYSTEM,
        language: updates.language ?? 'en',
        currency: updates.currency ?? Currency.ZAR,
        reducedMotion: updates.reducedMotion ?? false,
      },
      select: {
        theme: true,
        language: true,
        currency: true,
        reducedMotion: true,
      },
    });
  }

  async deactivateAccount(authUser: AuthUser) {
    const currentUser = await this.findOrCreateUser(authUser);
    const deactivatedAt = new Date();

    await this.prisma.user.update({
      where: { id: currentUser.id },
      data: { deletedAt: deactivatedAt },
    });

    return {
      deactivated: true,
      deactivatedAt,
    };
  }

  async exportUserData(authUser: AuthUser): Promise<UserExportResult> {
    const userIdentity = await this.prisma.user.findUnique({
      where: { supabaseAuthId: authUser.supabaseAuthId },
      select: { id: true, deletedAt: true },
    });

    if (!userIdentity || userIdentity.deletedAt) {
      throw new UnauthorizedException('Active user account was not found');
    }

    const userData = await this.prisma.user.findUnique({
      where: { id: userIdentity.id },
      select: userExportSelect,
    });

    if (!userData) {
      throw new UnauthorizedException('Active user account was not found');
    }

    const {
      preference,
      notificationPreference,
      creditProfile,
      gamificationProfile,
      obligations,
      paymentOccurrences,
      paymentRecords,
      reminders,
      notifications,
      scoreEvents,
      badges,
      userEvents,
      rewardTransactions,
      quizSessions,
      ...user
    } = userData;

    return {
      exportedAt: new Date(),
      user,
      preferences: preference,
      notificationPreferences: notificationPreference,
      creditProfile,
      gamificationProfile,
      obligations,
      paymentOccurrences,
      paymentRecords,
      reminders,
      notifications,
      scoreEvents,
      badges,
      userEvents,
      rewardTransactions,
      quizSessions,
    };
  }
}
