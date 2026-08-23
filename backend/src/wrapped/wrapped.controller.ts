import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { UsersService } from '../users/users.service';
import { MonthlyWrappedService } from './wrapped.service';

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
  @ApiQuery({
    name: 'year',
    type: Number,
    example: 2026,
    required: false,
    description: 'default to the current year',
  })
  @ApiQuery({
    name: 'month',
    type: Number,
    example: 8,
    required: false,
    description: 'Month number between 1 and upto and including 12',
  })
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
  @ApiOkResponse({
    description: '',
    schema: {
      example: {
        year: 2026,
        month: 8,
        badgesEarned: 2,
        badges: [
          {
            badgeKey: 'FIRST_OBLIGATION_CREATED',
            name: 'First Obligation',
            description: 'Created your first tracked financial obligation',
            category: 'OBLIGATION',
            iconKey: 'plus-circle',
            earnedAt: '2026-08-04T15:05:00.000Z',
          },
          {
            badgeKey: 'FIRST_ON_TIME_PAYMENT',
            name: 'On-time Starter',
            description: 'Logged your first on-time payment',
            category: 'PAYMENT',
            iconKey: 'check-circle',
            earnedAt: '2026-08-14T15:05:00.000Z',
          },
        ],
      },
    },
  })
  async getMonthlyWrapped(
    @CurrentAuthUser() authUser: AuthUser,
  ) {
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
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.monthlyWrappedService.getBadgesForMonth(user.id, year, month);
  }
}
