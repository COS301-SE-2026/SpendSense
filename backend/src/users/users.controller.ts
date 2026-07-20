import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(SupabaseJwtGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Get the authenticated user profile',
    description:
      'Returns the internal SpendSense user profile for the current Supabase-authenticated user. Creates the user and default profile records on first call.',
  })
  @ApiOkResponse({
    description:
      'The authenticated user profile and related default preference, credit, and gamification records.',
    schema: {
      example: {
        data: {
          user: {
            id: '9f2d7f49-53a2-457c-8a50-8a9d22db83e4',
            email: 'student@example.com',
            displayName: 'Kyle',
            avatarUrl: null,
            monthlyBudget: null,
            onboardingCompleted: false,
            createdAt: '2026-05-20T10:00:00.000Z',
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
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, or invalid Supabase Bearer token.',
  })
  @Get('me')
  async getMe(@CurrentAuthUser() authUser: AuthUser) {
    const userProfile = await this.usersService.findOrCreateUser(authUser);
    const {
      preference,
      notificationPreference,
      creditProfile,
      gamificationProfile,
      id,
      email,
      displayName,
      avatarUrl,
      monthlyBudget,
      onboardingCompleted,
      createdAt,
    } = userProfile;

    return {
      user: {
        id,
        email,
        displayName,
        avatarUrl,
        monthlyBudget,
        onboardingCompleted,
        createdAt,
      },
      preferences: preference,
      notificationPreferences: notificationPreference,
      creditProfile,
      gamificationProfile,
    };
  }

  @ApiOperation({
    summary: 'Update the authenticated user profile',
    description:
      'Updates user-editable profile fields. Email, identity, score, gamification, and deletion fields are read-only.',
  })
  @ApiOkResponse({
    description: 'The updated authenticated user profile and related records.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, or invalid Supabase Bearer token.',
  })
  @Patch('me')
  async updateMe(
    @CurrentAuthUser() authUser: AuthUser,
    @Body() updates: UpdateProfileDto,
  ) {
    const userProfile = await this.usersService.updateProfile(authUser, updates);
    const {
      preference,
      notificationPreference,
      creditProfile,
      gamificationProfile,
      id,
      email,
      displayName,
      avatarUrl,
      monthlyBudget,
      onboardingCompleted,
      createdAt,
    } = userProfile;

    return {
      user: {
        id,
        email,
        displayName,
        avatarUrl,
        monthlyBudget,
        onboardingCompleted,
        createdAt,
      },
      preferences: preference,
      notificationPreferences: notificationPreference,
      creditProfile,
      gamificationProfile,
    };
  }
}
