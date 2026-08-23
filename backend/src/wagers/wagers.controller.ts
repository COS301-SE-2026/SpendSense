import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Delete,
  Patch,
} from '@nestjs/common';
import { WagerStatus } from '@prisma/client';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { UsersService } from '../users/users.service';
import { CreateWagerDto } from './dto/create-wager.dto';
import { ListWagersDto } from './dto/list-wagers.dto';
import { WagersService } from './wagers.service';

@ApiTags('wagers')
@ApiBearerAuth()
@Controller('wagers')
@UseGuards(SupabaseJwtGuard)
export class WagersController {
  constructor(
    private readonly wagersService: WagersService,
    private readonly usersService: UsersService,
  ) {}

  @ApiOperation({
    summary: 'Create a wager against a friend',
  })
  @ApiCreatedResponse({
    description: 'The pending wager was created.',
    schema: {
      example: {
        data: {
          id: 'c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
          creatorId: '3c1f2a10-3e2b-4a2b-9f0a-1b2c3d4e5f6a',
          opponentId: '9f2d7f49-53a2-457c-8a50-8a9d22db83e4',
          taskType: 'ALL_PAYMENTS_ON_TIME',
          stakeAmount: 50,
          status: 'PENDING',
          durationDays: 7,
          invitedAt: '2026-08-09T09:00:00.000Z',
          startDate: null,
          endDate: null,
          resolvedAt: null,
          creatorOutcome: null,
          opponentOutcome: null,
          isCreator: true,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Opponent is not a current friend, the caller challenged themselves, or the creator has insufficient coins.',
    schema: {
      example: {
        statusCode: 400,
        message: 'You can only create wagers with current friends',
        timestamp: '2026-08-10T10:00:00.000Z',
        path: '/api/v1/wagers',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Opponent does not exist.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Opponent not found',
        timestamp: '2026-08-10T10:00:00.000Z',
        path: '/api/v1/wagers',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer token.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        timestamp: '2026-08-10T10:00:00.000Z',
        path: '/api/v1/wagers',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server failure.',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        timestamp: '2026-08-10T10:00:00.000Z',
        path: '/api/v1/wagers',
      },
    },
  })
  @Post()
  async createWager(
    @CurrentAuthUser() authUser: AuthUser,
    @Body() body: CreateWagerDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.wagersService.createWager(user.id, body);
  }

  @ApiOperation({
    summary: 'List the authenticated user’s wagers',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: WagerStatus,
    description: 'Optional wager status filter.',
  })
  @ApiOkResponse({
    description: 'Wagers where the authenticated user is a participant.',
    schema: {
      example: {
        data: [
          {
            id: 'c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
            creatorId: '3c1f2a10-3e2b-4a2b-9f0a-1b2c3d4e5f6a',
            creatorDisplayName: 'Kahlan',
            opponentId: '9f2d7f49-53a2-457c-8a50-8a9d22db83e4',
            opponentDisplayName: 'Rachel',
            taskType: 'ALL_PAYMENTS_ON_TIME',
            stakeAmount: 50,
            status: 'ACTIVE',
            durationDays: 7,
            invitedAt: '2026-08-09T09:00:00.000Z',
            respondedAt: '2026-08-09T10:00:00.000Z',
            startDate: '2026-08-09T10:00:00.000Z',
            endDate: '2026-08-16T10:00:00.000Z',
            resolvedAt: null,
            creatorOutcome: null,
            opponentOutcome: null,
            isCreator: true,
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid wager status filter.',
    schema: {
      example: {
        statusCode: 400,
        message:
          'status must be one of the following values: PENDING, ACTIVE, COMPLETED, DECLINED, CANCELLED, EXPIRED',
        timestamp: '2026-08-10T10:00:00.000Z',
        path: '/api/v1/wagers?status=INVALID',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer token.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        timestamp: '2026-08-10T10:00:00.000Z',
        path: '/api/v1/wagers',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server failure.',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        timestamp: '2026-08-10T10:00:00.000Z',
        path: '/api/v1/wagers',
      },
    },
  })
  @Get()
  async listWagers(
    @CurrentAuthUser() authUser: AuthUser,
    @Query() query: ListWagersDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.wagersService.listWagers(user.id, query.status);
  }

  @ApiOperation({
    summary: 'Get a wager by ID',
  })
  @ApiParam({
    name: 'id',
    example: 'c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
    description: 'ID of the wager.',
  })
  @ApiOkResponse({
    description: 'The requested wager.',
    schema: {
      example: {
        data: {
          id: 'c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
          creatorId: '3c1f2a10-3e2b-4a2b-9f0a-1b2c3d4e5f6a',
          creatorDisplayName: 'Kahlan',
          opponentId: '9f2d7f49-53a2-457c-8a50-8a9d22db83e4',
          opponentDisplayName: 'Rachel',
          taskType: 'ALL_PAYMENTS_ON_TIME',
          stakeAmount: 50,
          status: 'ACTIVE',
          durationDays: 7,
          invitedAt: '2026-08-09T09:00:00.000Z',
          respondedAt: '2026-08-09T10:00:00.000Z',
          startDate: '2026-08-09T10:00:00.000Z',
          endDate: '2026-08-16T10:00:00.000Z',
          resolvedAt: null,
          creatorOutcome: null,
          opponentOutcome: null,
          isCreator: true,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'The authenticated user is not a participant in this wager.',
    schema: {
      example: {
        statusCode: 403,
        message: 'You cannot access this wager',
        timestamp: '2026-08-10T10:00:00.000Z',
        path: '/api/v1/wagers/c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Wager does not exist.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Wager not found',
        timestamp: '2026-08-10T10:00:00.000Z',
        path: '/api/v1/wagers/c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer token.',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
        timestamp: '2026-08-10T10:00:00.000Z',
        path: '/api/v1/wagers/c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Unexpected server failure.',
    schema: {
      example: {
        statusCode: 500,
        message: 'Internal server error',
        timestamp: '2026-08-10T10:00:00.000Z',
        path: '/api/v1/wagers/c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
      },
    },
  })
  @Get(':id')
  async getWager(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('id') wagerId: string,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.wagersService.getWager(user.id, wagerId);
  }
    @ApiOperation({
    summary:'Accept a pending wager',
  })
  @ApiParam({
    name:'id',
    example:'c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
    description:'ID of the wager.',
  })
  @ApiOkResponse({
    description:'The wager was accepted and both stakes were deducted.',
    schema:{
      example:{
        data:{
          id:'c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
          status:'ACTIVE',
          respondedAt:'2026-08-09T10:00:00.000Z',
          startDate:'2026-08-09T10:00:00.000Z',
          endDate:'2026-08-16T10:00:00.000Z',
          coinBalance:175,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:'The wager is not pending or a participant has insufficient coins.',
    schema:{
      example:{
        statusCode:400,
        message:'Only a pending wager can be accepted',
        timestamp:'2026-08-10T10:00:00.000Z',
        path:'/api/v1/wagers/c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f/accept',
      },
    },
  })
  @ApiForbiddenResponse({
    description:'Only the invited opponent can accept the wager.',
    schema:{
      example:{
        statusCode:403,
        message:'Only the invited opponent can accept this wager',
        timestamp:'2026-08-10T10:00:00.000Z',
        path:'/api/v1/wagers/c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f/accept',
      },
    },
  })
  @ApiNotFoundResponse({
    description:'Wager does not exist.',
    schema:{
      example:{
        statusCode:404,
        message:'Wager not found',
        timestamp:'2026-08-10T10:00:00.000Z',
        path:'/api/v1/wagers/c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f/accept',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description:'Missing or invalid Bearer token.',
  })
  @ApiInternalServerErrorResponse({
    description:'Unexpected server failure.',
  })
  @Patch(':id/accept')
  async acceptWager(
    @CurrentAuthUser() authUser:AuthUser,
    @Param('id') wagerId:string,
  ){
    const user=await this.usersService.findOrCreateUser(authUser);
    return this.wagersService.acceptWager(user.id,wagerId);
  }

  @ApiOperation({
    summary:'Decline a pending wager',
  })
  @ApiParam({
    name:'id',
    example:'c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
    description:'ID of the wager.',
  })
  @ApiOkResponse({
    description:'The wager was declined.',
    schema:{
      example:{
        data:{
          id:'c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
          status:'DECLINED',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:'The wager is not pending.',
    schema:{
      example:{
        statusCode:400,
        message:'Only a pending wager can be declined',
        timestamp:'2026-08-10T10:00:00.000Z',
        path:'/api/v1/wagers/c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f/decline',
      },
    },
  })
  @ApiForbiddenResponse({
    description:'Only the invited opponent can decline the wager.',
    schema:{
      example:{
        statusCode:403,
        message:'Only the invited opponent can decline this wager',
        timestamp:'2026-08-10T10:00:00.000Z',
        path:'/api/v1/wagers/c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f/decline',
      },
    },
  })
  @ApiNotFoundResponse({
    description:'Wager does not exist.',
    schema:{
      example:{
        statusCode:404,
        message:'Wager not found',
        timestamp:'2026-08-10T10:00:00.000Z',
        path:'/api/v1/wagers/c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f/decline',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description:'Missing or invalid Bearer token.',
  })
  @ApiInternalServerErrorResponse({
    description:'Unexpected server failure.',
  })
  @Patch(':id/decline')
  async declineWager(
    @CurrentAuthUser() authUser:AuthUser,
    @Param('id') wagerId:string,
  ){
    const user=await this.usersService.findOrCreateUser(authUser);
    return this.wagersService.declineWager(user.id,wagerId);
  }

  @ApiOperation({
    summary:'Cancel a pending wager',
  })
  @ApiParam({
    name:'id',
    example:'c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
    description:'ID of the wager.',
  })
  @ApiOkResponse({
    description:'The wager was cancelled.',
    schema:{
      example:{
        data:{
          id:'c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
          status:'CANCELLED',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description:'The wager is not pending.',
    schema:{
      example:{
        statusCode:400,
        message:'Only a pending wager can be cancelled',
        timestamp:'2026-08-10T10:00:00.000Z',
        path:'/api/v1/wagers/c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
      },
    },
  })
  @ApiForbiddenResponse({
    description:'Only the creator can cancel the wager.',
    schema:{
      example:{
        statusCode:403,
        message:'Only the creator can cancel this wager',
        timestamp:'2026-08-10T10:00:00.000Z',
        path:'/api/v1/wagers/c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
      },
    },
  })
  @ApiNotFoundResponse({
    description:'Wager does not exist.',
    schema:{
      example:{
        statusCode:404,
        message:'Wager not found',
        timestamp:'2026-08-10T10:00:00.000Z',
        path:'/api/v1/wagers/c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description:'Missing or invalid Bearer token.',
  })
  @ApiInternalServerErrorResponse({
    description:'Unexpected server failure.',
  })
  @Delete(':id')
  async cancelWager(
    @CurrentAuthUser() authUser:AuthUser,
    @Param('id') wagerId:string,
  ){
    const user=await this.usersService.findOrCreateUser(authUser);
    return this.wagersService.cancelWager(user.id,wagerId);
  }
}
