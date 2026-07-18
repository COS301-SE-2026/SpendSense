import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { UsersService } from '../users/users.service';
import { InsightsService } from './insights.service';

@ApiTags('insights')
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)
@Controller('insights')
export class InsightsController {

    constructor(private readonly insightsService: InsightsService, private readonly usersService: UsersService) { }

    @Get('settled-payments')
    @ApiOperation({ summary: "Get all settled payment occurrences for the authenticated user" })
    @ApiResponse({ status: 200, description: 'Settlement rate returned successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorised' })
    async getSettledPayments(@CurrentAuthUser() authUser: AuthUser) {
        const user = await this.usersService.findOrCreateUser(authUser);
        return this.insightsService.getSettledPayments(user.id);
    }

    @Get('settlement-rate')
    @ApiOperation({ summary: "Calculate the authenticated user's payment settlement rate" })
    @ApiResponse({ status: 200, description: 'Settlement rate returned successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorised' })
    async getSettlementRate(@CurrentAuthUser() authUser: AuthUser) {
        const user = await this.usersService.findOrCreateUser(authUser);
        return this.insightsService.getSettlementRate(user.id);
    }
}