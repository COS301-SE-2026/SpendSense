import{
    Controller,
    Post,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
}from '@nestjs/common';
import{
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiBody,
    ApiResponse,
}from '@nestjs/swagger';
import {ObligationsService} from './obligations.service';
import {CreateObligationDto} from './dto/create-obligation.dto';
import {SupabaseJwtGuard} from '../auth/guards/supabase-jwt.guard';
import {CurrentAuthUser} from '../common/decorators/current-auth-user.decorator';
import {UsersService} from '../users/users.service';
import type {AuthUser} from '../auth/types/auth-user.type';

@ApiTags('obligations')
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)
@Controller('obligations')
export class ObligationsController{
    constructor(
        private readonly obligationsService: ObligationsService, private readonly usersService: UsersService,
    ){}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({summary: 'Create a financial obligation with schedule, occurrences, and reminders'})
    @ApiBody({ type: CreateObligationDto})
    @ApiResponse({status: 201, description: 'Obligation created successfully'})
    @ApiResponse({status: 400, description: 'Validation error or business rule violation'})
    @ApiResponse({status: 401, description: 'Unauthorised'})
    @ApiResponse({status: 404, description: 'Category not found'})

    async create(@CurrentAuthUser() authUser: AuthUser, @Body() dto: CreateObligationDto,){
        const user = await this.usersService.findOrCreateUser(authUser);
        
        return this.obligationsService.create(user.id, dto);
    }
}