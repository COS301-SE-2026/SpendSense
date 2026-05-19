import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScoreTier } from '@prisma/client';
import type { AuthUser } from '../auth/types/auth-user.type';

// UsersService: manages internal user records
// bridges supabaseAuthId with the internal user table & default related records

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // find/create the internal user for given supabase auth identity
  // on the first login, this creates User + UserPreference + NotificationPreference + CreditProfile + GamificationProfile in a single transactoin
  // returns the existing user on subsequent calls

  async findOrCreateUser(authUser: AuthUser) {
    const { supabaseAuthId, email } = authUser;

    // fast path for if user already exists
    const existing = await this.prisma.user.findUnique({
      where: { supabaseAuthId },
      include: {
        creditProfile: {
          select: { currentScore: true, scoreTier: true },
        },
        gamificationProfile: {
          select: {
            coinBalance: true,
            currentPaymentStreak: true,
            mascotMood: true,
          },
        },
      },
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
        include: {
          creditProfile: {
            select: { currentScore: true, scoreTier: true },
          },
          gamificationProfile: {
            select: {
              coinBalance: true,
              currentPaymentStreak: true,
              mascotMood: true,
            },
          },
        },
      });

      return user;
    });
  }
}
// will need to also add UserEvent when full obligations and payments flow implemented
