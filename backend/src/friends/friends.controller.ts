import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { UsersService } from '../users/users.service';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { SearchFriendsQueryDto } from './dto/search-friends-query.dto';
import { FriendsService } from './friends.service';

@ApiTags('friends')
@ApiBearerAuth()
@Controller('friends')
@UseGuards(SupabaseJwtGuard)
export class FriendsController {
  constructor(
    private readonly friendsService: FriendsService,
    private readonly usersService: UsersService,
  ) {}

  @ApiOperation({
    summary: 'Search people to add as friends',
    description:
      'Matches display names and emails server-side without returning email addresses. Excludes the caller, existing friends, and pending requests.',
  })
  @ApiQuery({ name: 'query', required: true, minLength: 2 })
  @ApiOkResponse({
    description: 'Up to 20 privacy-safe user summaries.',
    schema: {
      example: {
        data: [
          {
            id: '3c1f2a10-3e2b-4a2b-9f0a-1b2c3d4e5f6a',
            displayName: 'Kahlan',
            avatarUrl: null,
          },
        ],
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid Bearer token.' })
  @Get('search')
  async search(
    @CurrentAuthUser() authUser: AuthUser,
    @Query() query: SearchFriendsQueryDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.friendsService.searchUsers(user.id, query.query);
  }

  @ApiOperation({ summary: 'Send a friend request' })
  @ApiCreatedResponse({
    description: 'The pending friend request.',
    schema: {
      example: {
        data: {
          id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
          senderId: '9f2d7f49-53a2-457c-8a50-8a9d22db83e4',
          receiverId: '3c1f2a10-3e2b-4a2b-9f0a-1b2c3d4e5f6a',
          status: 'PENDING',
          createdAt: '2026-08-21T10:00:00.000Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Invalid receiver, self-request, duplicate request, or existing friendship.',
  })
  @ApiNotFoundResponse({ description: 'Receiver does not exist.' })
  @Post('requests')
  async createRequest(
    @CurrentAuthUser() authUser: AuthUser,
    @Body() body: CreateFriendRequestDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.friendsService.createRequest(user.id, body.receiverId);
  }
}
