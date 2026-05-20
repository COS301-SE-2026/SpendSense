import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { DashboardService } from './dashboard.service';
import { UsersService } from '../users/users.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get dashboard data for the current user' })
  @ApiOkResponse({ description: 'Dashboard data returned successfully' })
  @ApiUnauthorizedResponse({ description: 'User is not authenticated' })
  async getDashboard(@CurrentAuthUser() authUser: AuthUser) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.dashboardService.getDashboard(user.id);
  }
}
