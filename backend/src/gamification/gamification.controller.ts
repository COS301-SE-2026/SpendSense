import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { GamificationService } from './gamification.service';

@ApiTags('gamification')
@ApiBearerAuth()
@Controller('gamification')
@UseGuards(SupabaseJwtGuard)
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @ApiOperation({
    summary: 'Get the authenticated user gamification profile',
    description:
      'Returns the current coins, XP, streak, mascot state, mascot level progress, mood reason, equipped cosmetics, and earned badges for the Supabase-authenticated user.',
  })
  @ApiOkResponse({
    description:
      'The current gamification profile, wrapped by the global response envelope.',
    schema: {
      example: {
        data: {
          coins: 145,
          xp: 320,
          paymentStreak: 4,
          longestStreak: 7,
          knowledgeStreak: 1,
          longestKnowledgeStreak: 5,
          mascotLevelProgress: {
            currentLevelXp: 20,
            xpForNextLevel: 100,
            percentToNextLevel: 20,
          },
          mascotLevel: 3,
          mascotMood: 'HAPPY',
          equippedCosmetics: [
            {
              slot: 'HAT',
              code: 'party_hat',
              iconKey: 'hat_party',
            },
          ],
          moodReason: 'Made a payment on time',
          badges: [
            {
              badgeKey: 'FIRST_ON_TIME_PAYMENT',
              name: 'First On-Time Payment',
              description: 'Made your first payment on time.',
              category: 'PAYMENT',
              iconKey: 'badge_first_payment',
              earnedAt: '2026-05-18T09:00:00.000Z',
            },
          ],
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, or invalid Supabase Bearer token.',
  })
  @Get('profile')
  async getGamificationProfile(@CurrentAuthUser() authUser: AuthUser) {
    return this.gamificationService.getGamificationProfile(authUser);
  }
}
