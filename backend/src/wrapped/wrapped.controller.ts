import {
  Controller,
  Get,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { UsersService } from '../users/users.service';
import { MonthlyWrappedService } from './wrapped.service';
import type { WrappedSummary } from './types/wrapped-summary.type';
@ApiTags('wrapped')
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)
@Controller('wrapped')
export class MonthlyWrappedController {
  constructor(
    private readonly monthlyWrappedService: MonthlyWrappedService,
    private readonly usersService: UsersService,
  ) {}

  @Get('latest')
  @ApiOperation({ summary: 'Get badges earned during a specified month' })
  @ApiResponse({
    status: 200,
    description: 'Monthly Wrapped was returned successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid year or month',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorised',
  })
  async getMonthlyWrapped(@CurrentAuthUser() authUser: AuthUser) {
    const user = await this.usersService.findOrCreateUser(authUser);
    const currentDate = new Date();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      throw new BadRequestException('Invalid year or month');
    }
    return this.monthlyWrappedService.getWrappedResponse(user.id, '2026-08');
  }
}
