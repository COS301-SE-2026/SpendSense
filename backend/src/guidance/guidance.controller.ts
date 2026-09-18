import { Controller, Get, UseGuards, Body, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { GuidanceService } from './guidance.service';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { UpdateGuidanceStateDto } from './dto/update-guidance-state.dto';
import type { AuthUser } from '../auth/types/auth-user.type';

@Controller('guidance')
@ApiBearerAuth()
@ApiTags('guidance')
@UseGuards(SupabaseJwtGuard)
export class GuidanceController {
  constructor(private readonly guidanceService: GuidanceService) {}

  @ApiOperation({
    summary: 'Get mascot guidance state.',
    description:
      'Returns the users mascot walkthrough state and guidance preferences.',
  })
  @ApiOkResponse({
    description: 'The current mascot guidance state.',
    schema: {
      example: {
        data: {
          tipsEnabled: true,
          dailyExpansionEnabled: true,
          walkthrough: {
            status: 'NOT_STARTED',
            currentStep: 0,
          },
          dismissedTipIds: [],
          updatedAt: null,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Supabase Bearer token.',
  })
  @Get('state')
  async getState(@CurrentAuthUser() authUser: AuthUser) {
    return this.guidanceService.getState(authUser);
  }

  @ApiOperation({
    summary: 'Update mascot guidance state.',
    description:
      'Updates the users mascot walkthrough state and guidance preferences.',
  })
  @ApiOkResponse({
    description: 'The updated mascot guidance state.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid Supabase Bearer token.',
  })
  @Patch('state')
  async updateState(
    @CurrentAuthUser() authUser: AuthUser,
    @Body() dto: UpdateGuidanceStateDto,
  ) {
    return this.guidanceService.updateState(authUser, dto);
  }
}
