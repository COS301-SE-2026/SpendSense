import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { CreditService } from './credit.service';

@ApiTags('credit-profile')
@ApiBearerAuth()
@Controller('credit-profile')
@UseGuards(SupabaseJwtGuard)
export class CreditController {
  constructor(private readonly creditService: CreditService) {}

  @ApiOperation({
    summary: 'Get the authenticated user credit profile',
    description:
      'Returns the current simulated credit profile for the Supabase-authenticated user.',
  })
  @ApiOkResponse({
    description: 'The current credit profile, wrapped by the global response envelope.',
    schema: {
      example: {
        data: {
          currentScore: 600,
          previousScore: 600,
          scoreTier: 'GOOD',
          onTimeCount: 0,
          lateCount: 0,
          missedCount: 0,
          lastCalculatedAt: null,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, or invalid Supabase Bearer token.',
  })
  @Get()
  async getCreditProfile(@CurrentAuthUser() authUser: AuthUser) {
    return this.creditService.getCreditProfile(authUser);
  }
}
