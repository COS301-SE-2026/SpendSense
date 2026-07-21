import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Prisma,
  ScoreTier,
  UserEventSourceType,
  UserEventType,
} from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import type { UpdateProfileDto } from './dto/update-profile.dto';

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

export type InternalUserProfile = Prisma.UserGetPayload<{
  include: typeof userProfileInclude;
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
}
