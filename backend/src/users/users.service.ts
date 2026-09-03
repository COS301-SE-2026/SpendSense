import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
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
import {
  getDisplayNameViolation,
  getDisplayNameViolationMessage,
  normalizeDisplayName,
} from './display-name-policy';

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
      lastKnowledgeStreakDate: true,
    },
  },
} satisfies Prisma.UserInclude;

function isDisplayNameUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const prismaError = error as {
    code?: unknown;
    meta?: { target?: unknown };
  };

  if (prismaError.code !== 'P2002') {
    return false;
  }

  const target = prismaError.meta?.target;
  return Array.isArray(target) && target.includes('displayName');
}

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
      lastKnowledgeStreakDate: true,
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

export type UserDataDeletionResult = {
  deleted: true;
  deletedAt: Date;
  recordsDeleted: Record<string, number>;
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

  async checkDisplayName(displayName: string): Promise<{
    available: boolean;
    reason?: 'taken' | 'prohibited';
  }> {
    const normalizedDisplayName = normalizeDisplayName(displayName);
    if (getDisplayNameViolation(normalizedDisplayName) === 'prohibited') {
      return { available: false, reason: 'prohibited' };
    }

    const existing = await this.prisma.user.findUnique({
      where: { displayName: normalizedDisplayName },
      select: { id: true },
    });

    return existing === null
      ? { available: true }
      : { available: false, reason: 'taken' };
  }

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

    const displayName = normalizeDisplayName(authUser.displayName);
    const displayNameViolation = getDisplayNameViolation(displayName);
    if (displayNameViolation) {
      throw new BadRequestException(
        getDisplayNameViolationMessage(displayNameViolation),
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            supabaseAuthId,
            email: email ?? `${supabaseAuthId}@unknown.spendsense`,
            displayName,
            avatarUrl: `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(supabaseAuthId)}`,
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
    } catch (error) {
      if (isDisplayNameUniqueConstraintError(error)) {
        throw new ConflictException('Display name is already taken');
      }

      throw error;
    }
  }

  async updateProfile(
    authUser: AuthUser,
    updates: UpdateProfileDto,
  ): Promise<InternalUserProfile> {
    if (Object.keys(updates).length === 0) {
      throw new BadRequestException('At least one profile field is required');
    }

    const currentUser = await this.findOrCreateUser(authUser);
    const displayName =
      updates.displayName !== undefined
        ? normalizeDisplayName(updates.displayName)
        : undefined;
    const displayNameViolation =
      displayName !== undefined ? getDisplayNameViolation(displayName) : null;

    if (displayNameViolation) {
      throw new BadRequestException(
        getDisplayNameViolationMessage(displayNameViolation),
      );
    }

    try {
      return await this.prisma.user.update({
        where: { id: currentUser.id },
        data: {
          ...(displayName !== undefined && {
            displayName,
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
    } catch (error) {
      if (isDisplayNameUniqueConstraintError(error)) {
        throw new ConflictException('Display name is already taken');
      }

      throw error;
    }
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

  async deleteAllUserData(authUser: AuthUser): Promise<UserDataDeletionResult> {
    const userIdentity = await this.prisma.user.findUnique({
      where: { supabaseAuthId: authUser.supabaseAuthId },
      select: { id: true },
    });

    if (!userIdentity) {
      throw new NotFoundException('User account was not found');
    }

    const userId = userIdentity.id;
    const deletedAt = new Date();

    const recordsDeleted = await this.prisma.$transaction(async (tx) => {
      const scoreEvents = await tx.scoreEvent.deleteMany({ where: { userId } });
      const reminders = await tx.reminder.deleteMany({ where: { userId } });
      const paymentRecords = await tx.paymentRecord.deleteMany({
        where: { userId },
      });
      const paymentOccurrences = await tx.paymentOccurrence.deleteMany({
        where: { userId },
      });
      const paymentSchedules = await tx.paymentSchedule.deleteMany({
        where: { obligation: { userId } },
      });
      const obligations = await tx.financialObligation.deleteMany({
        where: { userId },
      });
      const notifications = await tx.notification.deleteMany({
        where: { userId },
      });
      const rewardTransactions = await tx.rewardTransaction.deleteMany({
        where: { userId },
      });
      const userEvents = await tx.userEvent.deleteMany({ where: { userId } });
      const badges = await tx.userBadge.deleteMany({ where: { userId } });
      const quizAnswers = await tx.quizSessionAnswer.deleteMany({
        where: { session: { userId } },
      });
      const quizSessions = await tx.quizSession.deleteMany({
        where: { userId },
      });
      const inventoryItems = await tx.userInventoryItem.deleteMany({
        where: { userId },
      });
      const creditProfile = await tx.creditProfile.deleteMany({
        where: { userId },
      });
      const gamificationProfile = await tx.gamificationProfile.deleteMany({
        where: { userId },
      });
      const notificationPreference = await tx.notificationPreference.deleteMany(
        { where: { userId } },
      );
      const preference = await tx.userPreference.deleteMany({
        where: { userId },
      });

      await tx.user.delete({ where: { id: userId } });

      return {
        scoreEvents: scoreEvents.count,
        reminders: reminders.count,
        paymentRecords: paymentRecords.count,
        paymentOccurrences: paymentOccurrences.count,
        paymentSchedules: paymentSchedules.count,
        obligations: obligations.count,
        notifications: notifications.count,
        rewardTransactions: rewardTransactions.count,
        userEvents: userEvents.count,
        badges: badges.count,
        quizAnswers: quizAnswers.count,
        quizSessions: quizSessions.count,
        inventoryItems: inventoryItems.count,
        creditProfile: creditProfile.count,
        gamificationProfile: gamificationProfile.count,
        notificationPreference: notificationPreference.count,
        preference: preference.count,
        user: 1,
      };
    });

    // TODO: the Supabase auth identity (email + credentials) still exists and
    // has to be removed with a service-role admin client for the erasure to be
    // complete under POPIA. That client does not exist in this codebase yet.
    return { deleted: true, deletedAt, recordsDeleted };
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
