import {Body,Controller,Get,Param,Post,Query,UseGuards} from '@nestjs/common';
import {WagerStatus} from '@prisma/client';
import {ApiBadRequestResponse,ApiBearerAuth,ApiCreatedResponse,ApiForbiddenResponse,ApiNotFoundResponse,ApiOkResponse,ApiOperation,ApiQuery,ApiTags,ApiUnauthorizedResponse} from '@nestjs/swagger';
import {SupabaseJwtGuard} from '../auth/guards/supabase-jwt.guard';
import type {AuthUser} from '../auth/types/auth-user.type';
import {CurrentAuthUser} from '../common/decorators/current-auth-user.decorator';
import {UsersService} from '../users/users.service';
import {CreateWagerDto} from './dto/create-wager.dto';
import {ListWagersDto} from './dto/list-wagers.dto';
import {WagersService} from './wagers.service';

@ApiTags('wagers')
@ApiBearerAuth()
@Controller('wagers')
@UseGuards(SupabaseJwtGuard)
export class WagersController{
    constructor(
        private readonly wagersService:WagersService,
        private readonly usersService:UsersService,
    ){}

    @ApiOperation({
        summary:'Create a wager against a friend',
    })
    @ApiCreatedResponse({
        description:'The pending wager was created.',
    })
    @ApiBadRequestResponse({
        description:'Invalid opponent, non-friend opponent, or insufficient coin balance.',
    })
    @ApiNotFoundResponse({
        description:'Opponent does not exist.',
    })
    @ApiUnauthorizedResponse({
        description:'Missing or invalid Bearer token.',
    })
    @Post()
    async createWager(
        @CurrentAuthUser() authUser:AuthUser,
        @Body() body:CreateWagerDto,
    ){
        const user=await this.usersService.findOrCreateUser(authUser);
        return this.wagersService.createWager(user.id,body);
    }

    @ApiOperation({
        summary:'List the authenticated user’s wagers',
    })
    @ApiQuery({
        name:'status',
        required:false,
        enum:WagerStatus,
    })
    @ApiOkResponse({
        description:'Wagers where the authenticated user is a participant.',
    })
    @ApiUnauthorizedResponse({
        description:'Missing or invalid Bearer token.',
    })
    @Get()
    async listWagers(
        @CurrentAuthUser() authUser:AuthUser,
        @Query() query:ListWagersDto,
    ){
        const user=await this.usersService.findOrCreateUser(authUser);
        return this.wagersService.listWagers(user.id,query.status);
    }

    @ApiOperation({
        summary:'Get a wager by ID',
    })
    @ApiOkResponse({
        description:'The requested wager.',
    })
    @ApiForbiddenResponse({
        description:'The authenticated user is not a participant in this wager.',
    })
    @ApiNotFoundResponse({
        description:'Wager does not exist.',
    })
    @ApiUnauthorizedResponse({
        description:'Missing or invalid Bearer token.',
    })
    @Get(':id')
    async getWager(
        @CurrentAuthUser() authUser:AuthUser,
        @Param('id') wagerId:string,
    ){
        const user=await this.usersService.findOrCreateUser(authUser);
        return this.wagersService.getWager(user.id,wagerId);
    }
}