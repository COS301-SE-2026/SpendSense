import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UsersService } from '../users/users.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import { SimulationsService } from './simulations.service';

@ApiTags('simulations')
@ApiBearerAuth()
@UseGuards(SupabaseJwtGuard)
@Controller('simulations')
export class SimulationsController {
  constructor(
    private readonly simulationsService: SimulationsService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a fictional simulated-month briefing',
    description:
      'Creates one persisted fictional briefing for the authenticated user. The selected catalogue content is snapshotted, and no real financial records or rewards are changed.',
  })
  @ApiBody({ type: CreateSimulationDto })
  @ApiCreatedResponse({
    description:
      'Persisted fictional briefing, wrapped by the global response envelope.',
  })
  @ApiBadRequestResponse({
    description:
      'The request body or Idempotency-Key header is invalid or missing.',
  })
  @ApiConflictResponse({
    description:
      'A resumable simulation already exists, or the idempotency key was reused with a different payload.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, or invalid Supabase Bearer token.',
  })
  async createSimulation(
    @CurrentAuthUser() authUser: AuthUser,
    @Body() dto: CreateSimulationDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.simulationsService.createBriefing(user.id, dto, idempotencyKey);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Get the authenticated player’s resumable simulation summary',
    description:
      'Returns the current briefing, active, or paused fictional simulation when one exists, along with a link summary for the latest completed simulation. It does not create a session or expose game content.',
  })
  @ApiOkResponse({
    description:
      'Active and latest-completed simulation summaries, wrapped by the global response envelope.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, or invalid Supabase Bearer token.',
  })
  async getActiveSimulation(@CurrentAuthUser() authUser: AuthUser) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.simulationsService.getActiveSession(user.id);
  }
}
