import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
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
import { ListFriendRequestsQueryDto } from './dto/list-friend-requests-query.dto';
import { ListLeaderboardQueryDto } from './dto/list-leaderboard-query.dto';
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

  @ApiOperation({ summary: 'List pending friend requests' })
  @ApiQuery({
    name: 'direction',
    required: false,
    enum: ['incoming', 'outgoing'],
  })
  @Get('requests')
  async listRequests(
    @CurrentAuthUser() authUser: AuthUser,
    @Query() query: ListFriendRequestsQueryDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.friendsService.listRequests(
      user.id,
      query.direction ?? 'incoming',
    );
  }

  @ApiOperation({ summary: 'Accept an incoming friend request' })
  @ApiBadRequestResponse({
    description: 'Friend request is no longer pending.',
  })
  @ApiForbiddenResponse({ description: 'Only the receiver may accept.' })
  @ApiNotFoundResponse({ description: 'Friend request does not exist.' })
  @Patch('requests/:id/accept')
  async acceptRequest(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('id') requestId: string,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.friendsService.acceptRequest(user.id, requestId);
  }

  @ApiOperation({ summary: 'Decline an incoming friend request' })
  @ApiBadRequestResponse({
    description: 'Friend request is no longer pending.',
  })
  @ApiForbiddenResponse({ description: 'Only the receiver may decline.' })
  @ApiNotFoundResponse({ description: 'Friend request does not exist.' })
  @Patch('requests/:id/decline')
  async declineRequest(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('id') requestId: string,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.friendsService.declineRequest(user.id, requestId);
  }

  @ApiOperation({ summary: 'Cancel an outgoing friend request' })
  @ApiBadRequestResponse({
    description: 'Friend request is no longer pending.',
  })
  @ApiForbiddenResponse({ description: 'Only the sender may cancel.' })
  @ApiNotFoundResponse({ description: 'Friend request does not exist.' })
  @Delete('requests/:id')
  async cancelRequest(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('id') requestId: string,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.friendsService.cancelRequest(user.id, requestId);
  }

  @ApiOperation({ summary: 'List the authenticated user’s friends' })
  @ApiOkResponse({
    description: 'Privacy-safe summaries for every current friend.',
  })
  @Get()
  async listFriends(@CurrentAuthUser() authUser: AuthUser) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.friendsService.listFriends(user.id);
  }

  @ApiOperation({ summary: 'Get the paginated friends leaderboard' })
  @ApiQuery({
    name: 'metric',
    required: false,
    enum: ['xp', 'coins', 'streak'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number, minimum: 1 })
  @ApiOkResponse({
    description:
      'A 20-entry leaderboard page with global ranks and pagination metadata.',
  })
  @Get('leaderboard')
  async listLeaderboard(
    @CurrentAuthUser() authUser: AuthUser,
    @Query() query: ListLeaderboardQueryDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.friendsService.listLeaderboard(
      user.id,
      query.metric ?? 'xp',
      query.page ?? 1,
    );
  }

  @ApiOperation({ summary: 'Get a friend’s public summary' })
  @ApiOkResponse({
    description: 'The requested friend’s privacy-safe summary.',
  })
  @ApiNotFoundResponse({ description: 'User is not a current friend.' })
  @Get(':friendId')
  async getFriend(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('friendId') friendId: string,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.friendsService.getFriend(user.id, friendId);
  }

  @ApiOperation({ summary: 'Remove a current friend' })
  @ApiOkResponse({ description: 'Both friendship directions were removed.' })
  @ApiNotFoundResponse({ description: 'User is not a current friend.' })
  @Delete(':friendId')
  async removeFriend(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('friendId') friendId: string,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.friendsService.removeFriend(user.id, friendId);
  }
}
