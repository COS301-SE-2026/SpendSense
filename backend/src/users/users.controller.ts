import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
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
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

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
    const userProfile = await this.usersService.updateProfile(
      authUser,
      updates,
    );
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
    summary: 'Deactivate the authenticated user account',
    description:
      'Soft-deactivates the authenticated user account by setting deletedAt. Related financial, score, and gamification history is preserved.',
  })
  @ApiOkResponse({
    description: 'The authenticated user account was deactivated.',
    schema: {
      example: {
        data: {
          deactivated: true,
          deactivatedAt: '2026-07-21T10:00:00.000Z',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, invalid, or deactivated account token.',
  })
  @Patch('me/deactivate')
  async deactivateMe(@CurrentAuthUser() authUser: AuthUser) {
    return this.usersService.deactivateAccount(authUser);
  }

  @ApiOperation({
    summary: 'Permanently delete all data for the authenticated user',
    description:
      'Fulfils a POPIA s24 deletion request. Irreversibly destroys every record SpendSense holds for the authenticated user, including the user record itself. Unlike deactivation, no financial, score, gamification, or quiz history is retained. Shared reference data such as categories and badge definitions is not affected.',
  })
  @ApiOkResponse({
    description: 'All data for the authenticated user was deleted.',
    schema: {
      example: {
        data: {
          deleted: true,
          deletedAt: '2026-07-21T10:00:00.000Z',
          recordsDeleted: {
            obligations: 4,
            paymentOccurrences: 26,
            paymentRecords: 18,
            user: 1,
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'No SpendSense user exists for this Supabase identity.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, or invalid Supabase Bearer token.',
  })
  @Delete('me/data')
  async deleteMyData(@CurrentAuthUser() authUser: AuthUser) {
    return this.usersService.deleteAllUserData(authUser);
  }

  @ApiOperation({
    summary: 'Export the authenticated user data',
    description:
      "Returns a read-only JSON export containing the authenticated user's own SpendSense data. Authentication secrets are excluded.",
  })
  @ApiOkResponse({
    description: 'The authenticated user data export.',
    schema: {
      example: {
        data: {
          exportedAt: '2026-07-21T10:00:00.000Z',
          user: {
            id: '9f2d7f49-53a2-457c-8a50-8a9d22db83e4',
            email: 'student@example.com',
            displayName: 'Kyle',
          },
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
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, invalid, or deactivated account token.',
  })
  @Get('me/export')
  async exportMe(@CurrentAuthUser() authUser: AuthUser) {
    return this.usersService.exportUserData(authUser);
  }

  @ApiOperation({
    summary: 'Updates authenticated users preferences',
    description:
      'Updates the general application preferences for an authenticated user, and creates the preference row if it is missing.',
  })
  @ApiOkResponse({
    description: 'The persisted preference values.',
    schema: {
      example: {
        data: {
          preferences: {
            theme: 'LIGHT',
            language: 'en',
            currency: 'ZAR',
            reducedMotion: false,
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, or invalid Supabase Bearer token.',
  })
  @Patch('me/preferences')
  async updateMyPreferences(
    @CurrentAuthUser() authUser: AuthUser,
    @Body() updates: UpdatePreferencesDto,
  ) {
    const preferences = await this.usersService.updatePreferences(
      authUser,
      updates,
    );

    return { preferences };
  }
}
