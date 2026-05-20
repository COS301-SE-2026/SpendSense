import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaymentOccurrencesService } from './payment-occurrences.service';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { UsersService } from '../users/users.service';
import type { AuthUser } from '../auth/types/auth-user.type';

@ApiTags('payment-occurrences')
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)

@Controller('payment-occurrences')
export class PaymentOccurrencesController {

    constructor(
        private readonly paymentOccurrencesService: PaymentOccurrencesService,
        private readonly usersService: UsersService,
    ) { }

    @Get('upcoming')
    @ApiOperation({ summary: "List the authenticated user's upcoming payment occurrences" })
    @ApiResponse({ status: 200, description: 'Upcoming payment occurrences returned successfully'})
    @ApiResponse({ status: 401, description: 'Unauthorised' })

    async findUpcoming(@CurrentAuthUser() authUser: AuthUser) {
        const user = await this.usersService.findOrCreateUser(authUser);
        return this.paymentOccurrencesService.findUpcoming(user.id);
    }
}