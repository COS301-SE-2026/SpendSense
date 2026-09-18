import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Patch,
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
import { ResolveSimulationEventDto } from './dto/resolve-simulation-event.dto';
import { UpdateSimulationStatusDto } from './dto/update-simulation-status.dto';
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

  @Post(':sessionId/events/:eventId/resolve')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Resolve one revealed fictional surprise event',
    description:
      'Applies exactly one persisted fictional event option. If a timed decision has expired, the server commits the authored expiry outcome instead.',
  })
  @ApiBody({ type: ResolveSimulationEventDto })
  @ApiCreatedResponse({
    description:
      'The fictional event result and refreshed safe session state, wrapped by the global response envelope.',
  })
  @ApiBadRequestResponse({
    description: 'A session ID, event ID, body, or Idempotency-Key is invalid.',
  })
  @ApiConflictResponse({
    description:
      'The event is not currently revealed, its timed decision expired, the session is not active, or the idempotency key was reused.',
  })
  @ApiNotFoundResponse({
    description: 'The simulation does not exist or is not owned by the caller.',
  })
  async resolveSimulationEvent(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('sessionId') sessionId: string,
    @Param('eventId') eventId: string,
    @Body() dto: ResolveSimulationEventDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.simulationsService.resolveEvent(
      user.id,
      sessionId,
      eventId,
      dto,
      idempotencyKey,
    );
  }

  @Post(':sessionId/continue')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Acknowledge a fictional payment or event result',
    description:
      'Clears an owned fictional result hold and resumes only the timed game clock. It does not change balances, score, obligations, events, or real records.',
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
      'The session is not active, has no payment/event result to acknowledge, or the idempotency key was reused.',
  })
  @ApiNotFoundResponse({
    description: 'The simulation does not exist or is not owned by the caller.',
  })
  async continueSimulation(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('sessionId') sessionId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.simulationsService.continueSession(
      user.id,
      sessionId,
      idempotencyKey,
    );
  }

  @Patch(':sessionId/status')
  @ApiOperation({
    summary: 'Pause, resume, or discard an owned fictional simulation',
    description:
      'Pauses, resumes, or abandons an owned fictional session. It does not affect real records.',
  })
  @ApiBody({ type: UpdateSimulationStatusDto })
  @ApiOkResponse({
    description:
      'The updated safe fictional session state, wrapped by the global response envelope.',
  })
  @ApiBadRequestResponse({
    description: 'The session ID, body, or Idempotency-Key header is invalid.',
  })
  @ApiConflictResponse({
    description:
      'The session cannot be paused, resumed, or discarded in its current state, or the idempotency key was reused.',
  })
  @ApiNotFoundResponse({
    description: 'The simulation does not exist or is not owned by the caller.',
  })
  async updateSimulationStatus(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSimulationStatusDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    if (dto.action === 'pause') {
      return this.simulationsService.pauseSession(
        user.id,
        sessionId,
        dto,
        idempotencyKey,
      );
    }
    if (dto.action === 'resume') {
      return this.simulationsService.resumeSession(
        user.id,
        sessionId,
        dto,
        idempotencyKey,
      );
    }
    return this.simulationsService.discardSession(
      user.id,
      sessionId,
      dto,
      idempotencyKey,
    );
  }
}
