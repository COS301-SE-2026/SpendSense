import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UsersService } from '../users/users.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import { SetupSimulationDto } from './dto/setup-simulation.dto';
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

  @Get(':sessionId')
  @ApiOperation({
    summary: 'Get an owned simulation for refresh or resume',
    description:
      'Returns only the authenticated player’s safe fictional session state. Future event content and unrevealed event score values are never returned.',
  })
  @ApiOkResponse({
    description:
      'Safe authoritative simulation state, wrapped by the global response envelope.',
  })
  @ApiBadRequestResponse({ description: 'The simulation ID is malformed.' })
  @ApiNotFoundResponse({
    description: 'The simulation does not exist or is not owned by the caller.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, malformed, or invalid Supabase Bearer token.',
  })
  async getSimulation(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('sessionId') sessionId: string,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.simulationsService.getSession(user.id, sessionId);
  }

  @Post(':sessionId/setup')
  @ApiOperation({
    summary: 'Confirm a fictional Current and Savings allocation',
    description:
      'Activates an owned simulation briefing with exactly one saved default allocation or a valid custom fictional Current amount. No real money moves.',
  })
  @ApiBody({ type: SetupSimulationDto })
  @ApiCreatedResponse({
    description:
      'The activated fictional allocation and session state, wrapped by the global response envelope.',
  })
  @ApiBadRequestResponse({
    description: 'The session ID, body, or Idempotency-Key header is invalid.',
  })
  @ApiConflictResponse({
    description:
      'Setup was already confirmed, or the idempotency key was reused with different data.',
  })
  @ApiNotFoundResponse({
    description: 'The simulation does not exist or is not owned by the caller.',
  })
  async setupSimulation(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: SetupSimulationDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.simulationsService.setupSession(
      user.id,
      sessionId,
      dto,
      idempotencyKey,
    );
  }

  @Post(':sessionId/advance')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Advance one fictional day in accessibility mode',
    description:
      'Runs exactly one server-owned simulated-day boundary for an owned accessibility-mode session. Timed sessions and pending decisions cannot be advanced manually.',
  })
  @ApiCreatedResponse({
    description:
      'The refreshed safe fictional session state, wrapped by the global response envelope.',
  })
  @ApiBadRequestResponse({
    description: 'The session ID or Idempotency-Key header is invalid.',
  })
  @ApiConflictResponse({
    description:
      'Timed mode is active, a decision/result is pending, the session is not active, or the idempotency key was reused.',
  })
  @ApiNotFoundResponse({
    description: 'The simulation does not exist or is not owned by the caller.',
  })
  async advanceSimulation(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('sessionId') sessionId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.simulationsService.advanceSession(
      user.id,
      sessionId,
      idempotencyKey,
    );
  }

  @Post(':sessionId/obligations/:obligationId/pay')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Pay one currently payable fictional obligation in full',
    description:
      'Uses fictional Current funds first and fictional Savings only for the remainder. It never creates a partial payment or changes real financial records.',
  })
  @ApiCreatedResponse({
    description:
      'The fictional payment result and refreshed safe session state, wrapped by the global response envelope.',
  })
  @ApiBadRequestResponse({
    description:
      'A session ID, obligation ID, or Idempotency-Key header is invalid.',
  })
  @ApiConflictResponse({
    description:
      'The session is not at a payable-obligation hold, fictional funds are insufficient, or the idempotency key was reused.',
  })
  @ApiNotFoundResponse({
    description: 'The simulation does not exist or is not owned by the caller.',
  })
  async paySimulationObligation(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('sessionId') sessionId: string,
    @Param('obligationId') obligationId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.simulationsService.payObligation(
      user.id,
      sessionId,
      obligationId,
      idempotencyKey,
    );
  }
}
