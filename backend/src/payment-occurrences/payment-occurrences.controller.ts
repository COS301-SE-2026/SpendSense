import {Controller, Get, Param, Query, UseGuards} from '@nestjs/common';
import{
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiResponse,
    ApiParam,
}from '@nestjs/swagger';
import {PaymentOccurrencesService} from './payment-occurrences.service';
import {UpcomingOccurrencesDto} from './dto/upcoming-occurrences.dto';
import {SupabaseJwtGuard} from '../auth/guards/supabase-jwt.guard';
import {CurrentAuthUser} from '../common/decorators/current-auth-user.decorator';
import {UsersService} from '../users/users.service';
import type {AuthUser} from '../auth/types/auth-user.type';

@ApiTags('payment-occurrences')
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)
@Controller('payment-occurrences')
export class PaymentOccurrencesController{
    constructor(
        private readonly paymentOccurrencesService: PaymentOccurrencesService,
        private readonly usersService: UsersService,
    ){}

    @Get('upcoming')
    @ApiOperation({summary: 'Get upcoming payment occurrences for dashboard and timeline views'})
    @ApiResponse({status: 200, description: 'Upcoming occurrences returned'})
    @ApiResponse({status: 401, description: 'Unauthorised'})
    async upcoming(@CurrentAuthUser() authUser: AuthUser, @Query() query: UpcomingOccurrencesDto,){
        const user = await this.usersService.findOrCreateUser(authUser);
        return this.paymentOccurrencesService.upcoming(user.id, query);
    }

    @Get(':id')
    @ApiOperation({summary: 'Get one payment occurrence with obligation context, payment record, and score risk'})
    @ApiParam({name: 'id', description: 'Occurrence ID'})
    @ApiResponse({status: 200, description: 'Occurrence detail returned'})
    @ApiResponse({status: 401, description: 'Unauthorised'})
    @ApiResponse({status: 404, description: 'Payment occurrence not found'})
    async findOne( @CurrentAuthUser() authUser: AuthUser, @Param('id') id: string,){
        const user = await this.usersService.findOrCreateUser(authUser);
        return this.paymentOccurrencesService.findOne(user.id, id);
    }
}