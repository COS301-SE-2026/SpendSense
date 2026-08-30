import { Injectable } from '@nestjs/common';
import { MascotMood, UserEventType } from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

type GamificationProfileShape = {
  coinBalance: number;
  xp: number;
  mascotLevel: number;
  mascotMood: MascotMood;
  currentPaymentStreak: number;
  longestPaymentStreak: number;
  currentKnowledgeStreak: number;
  longestKnowledgeStreak: number;
};

@Injectable()
export class GamificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async getGamificationProfile(authUser: AuthUser) {
    const user = await this.usersService.findOrCreateUser(authUser);
    const gamificationProfile =
      user.gamificationProfile ??
      (await this.prisma.gamificationProfile.create({
        data: {
          userId: user.id,
        },
        select: this.gamificationProfileSelect,
      }));

    const equippedInventory = await this.prisma.userInventoryItem.findMany({
      where: {
        userId: user.id,
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

    const latestMoodEvent = await this.prisma.userEvent.findMany({
      where: {
        userId: user.id,
        eventType: {
          in: [
            UserEventType.PAYMENT_LATE,
            UserEventType.PAYMENT_ON_TIME,
            UserEventType.PAYMENT_OVERDUE,
            UserEventType.QUIZ_COMPLETED,
            UserEventType.BADGE_EARNED,
          ],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        metadata: true,
      },
      take: 20,
    });

    const badges = await this.prisma.userBadge.findMany({
      where: {
        userId: user.id,
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

    const mascotLevelProgress = this.getMascotLevelProgress(
      gamificationProfile.xp,
    );

    const moodReason =
      gamificationProfile.mascotMood === MascotMood.NEUTRAL
        ? null
        : this.getMoodReasonFromEvents(latestMoodEvent);

    const equippedCosmetics = Array.from(
      new Map(
        equippedInventory.map((inventoryItem) => [
          inventoryItem.cosmeticItem.slot,
          {
            slot: inventoryItem.cosmeticItem.slot,
            code: inventoryItem.cosmeticItem.code,
            iconKey: inventoryItem.cosmeticItem.iconKey,
          },
        ]),
      ).values(),
    );

    return {
      ...this.toGamificationProfileResponse(gamificationProfile),
      badges: badges.map((badge) => ({
        badgeKey: badge.badgeDefinition.code,
        name: badge.badgeDefinition.name,
        description: badge.badgeDefinition.description,
        category: badge.badgeDefinition.category,
        iconKey: badge.badgeDefinition.iconKey,
        earnedAt: badge.earnedAt,
      })),

      moodReason,

      mascotLevelProgress,

      equippedCosmetics,
    };
  }

  private readonly gamificationProfileSelect = {
    coinBalance: true,
    xp: true,
    mascotLevel: true,
    mascotMood: true,
    currentPaymentStreak: true,
    longestPaymentStreak: true,
    currentKnowledgeStreak: true,
    longestKnowledgeStreak: true,
  };

  private toGamificationProfileResponse(profile: GamificationProfileShape) {
    return {
      coins: profile.coinBalance,
      xp: profile.xp,
      mascotLevel: profile.mascotLevel,
      mascotMood: profile.mascotMood,
      paymentStreak: profile.currentPaymentStreak,
      longestStreak: profile.longestPaymentStreak,
      knowledgeStreak: profile.currentKnowledgeStreak,
      longestKnowledgeStreak: profile.longestKnowledgeStreak,
    };
  }

  private getMoodReasonFromEvents(
    events: { metadata: unknown }[],
  ): string | null {
    for (const event of events) {
      const metadata = event.metadata;

      if (
        metadata &&
        typeof metadata === 'object' &&
        !Array.isArray(metadata) &&
        'moodReason' in metadata &&
        typeof metadata.moodReason === 'string'
      ) {
        return metadata.moodReason;
      }
    }
    return null;
  }

  private getMascotLevelProgress(xp: number) {
    const xpForNextLevel = 100;
    const currentLevelXp = xp % xpForNextLevel;
    const percentToNextLevel = Math.round(
      (currentLevelXp / xpForNextLevel) * 100,
    );

    return {
      currentLevelXp,
      xpForNextLevel,
      percentToNextLevel,
    };
  }
}
