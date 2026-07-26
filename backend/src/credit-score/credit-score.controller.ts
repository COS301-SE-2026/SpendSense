import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { UsersService } from '../users/users.service';
import { CreditScoreService } from './credit-score.service';

@ApiTags('credit-score')
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)
@Controller('credit-score')
export class CreditScoreController {
  constructor(
    private readonly insightsService: CreditScoreService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get rule-based insights for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Insights returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorised' })
  async getInsights(@CurrentAuthUser() authUser: AuthUser) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.insightsService.getCreditScore(user.id);
  }
}
