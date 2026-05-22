import { Injectable } from '@nestjs/common';
import { MascotMood } from '@prisma/client';
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
}
