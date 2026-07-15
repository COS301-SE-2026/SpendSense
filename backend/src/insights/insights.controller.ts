import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InsightsService } from './insights.service';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UsersService } from '../users/users.service';

@ApiTags('Insights')
@ApiBearerAuth()
@Controller('insights')
export class InsightsController {
    constructor(
        private readonly insightsService: InsightsService,
        private readonly usersService: UsersService,
    ){}

    @Get()
    @ApiOperation({
        summary: "Get stats-based insights",
        description:'Returns deterministic financial insights calculated from the authenticated user’s obligations and payment history.',
    })
    @ApiOkResponse({
        description: 'Stats-based insights returned successfully.',
        schema: {
            example: {
                generatedAt: '2026-07-15T08:00:00.000Z',
                cards: [],
            },
        },
    })
    async getInsights(@CurrentAuthUser() authUser: AuthUser) {
        const user = await this.usersService.findOrCreateUser(authUser);
        return this.insightsService.getInsights(user.id);
    }
}