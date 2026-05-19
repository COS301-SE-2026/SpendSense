import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';

// UsersController: internal user profile endpoints
// all routes require valid supabase jwt

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(SupabaseJwtGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /api/v1/users/me
  // returns the internal user profile for the authenticated caller, creates
  //the user and default records on first call

  /**
   * {
   *   "data": {
   *     "id": "...",
   *     "supabaseAuthId": "...",
   *     "email": "...",
   *     "displayName": null,
   *     "onboardingCompleted": false,
   *     "creditProfile": { "currentScore": 600, "scoreTier": "GOOD" },
   *     "gamificationProfile": { "coinBalance": 0, ... }
   *   }
   * }
   */

  @ApiOperation({
    summary: 'Get the authenticated user profile',
    description:
      'Returns the internal SpendSense user profile for the current Supabase-authenticated user.',
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
      onboardingCompleted,
      createdAt,
    } = userProfile;

    return {
      user: {
        id,
        email,
        displayName,
        avatarUrl,
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
