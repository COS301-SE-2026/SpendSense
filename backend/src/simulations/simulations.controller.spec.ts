import { Test, TestingModule } from '@nestjs/testing';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UsersService } from '../users/users.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import { SetupSimulationDto } from './dto/setup-simulation.dto';
import { ResolveSimulationEventDto } from './dto/resolve-simulation-event.dto';
import { UpdateSimulationStatusDto } from './dto/update-simulation-status.dto';
import { SimulationsController } from './simulations.controller';
import { SimulationsService } from './simulations.service';

describe('SimulationsController', () => {
  let controller: SimulationsController;
  const usersService = { findOrCreateUser: jest.fn() };
  const simulationsService = {
    createBriefing: jest.fn(),
    getActiveSession: jest.fn(),
    getSession: jest.fn(),
    setupSession: jest.fn(),
    advanceSession: jest.fn(),
    payObligation: jest.fn(),
    resolveEvent: jest.fn(),
    continueSession: jest.fn(),
    pauseSession: jest.fn(),
    resumeSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SimulationsController],
      providers: [
        { provide: UsersService, useValue: usersService },
        { provide: SimulationsService, useValue: simulationsService },
      ],
    }).compile();

    controller = module.get(SimulationsController);
    jest.clearAllMocks();
  });

  it('finds the authenticated application user before creating a briefing', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'supabase-user-1',
      email: 'player@example.com',
    };
    const dto: CreateSimulationDto = { timedMode: true };
    const idempotencyKey = '00000000-0000-4000-8000-000000000001';
    const response = { id: 'simulation-1', status: 'BRIEFING' };
    usersService.findOrCreateUser.mockResolvedValue({ id: 'user-1' });
    simulationsService.createBriefing.mockResolvedValue(response);

    await expect(
      controller.createSimulation(authUser, dto, idempotencyKey),
    ).resolves.toEqual(response);

    expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
    expect(simulationsService.createBriefing).toHaveBeenCalledWith(
      'user-1',
      dto,
      idempotencyKey,
    );
  });

  it('finds the authenticated application user before loading active state', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'supabase-user-1',
      email: 'player@example.com',
    };
    const response = { active: null, latestCompleted: null };
    usersService.findOrCreateUser.mockResolvedValue({ id: 'user-1' });
    simulationsService.getActiveSession.mockResolvedValue(response);

    await expect(controller.getActiveSimulation(authUser)).resolves.toEqual(
      response,
    );

    expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
    expect(simulationsService.getActiveSession).toHaveBeenCalledWith('user-1');
  });

  it('finds the authenticated application user before loading one simulation', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'supabase-user-1',
      email: 'player@example.com',
    };
    const sessionId = '00000000-0000-4000-8000-000000000010';
    const response = { session: { id: sessionId } };
    usersService.findOrCreateUser.mockResolvedValue({ id: 'user-1' });
    simulationsService.getSession.mockResolvedValue(response);

    await expect(
      controller.getSimulation(authUser, sessionId),
    ).resolves.toEqual(response);

    expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
    expect(simulationsService.getSession).toHaveBeenCalledWith(
      'user-1',
      sessionId,
    );
  });

  it('finds the authenticated application user before confirming setup', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'supabase-user-1',
      email: 'player@example.com',
    };
    const sessionId = '00000000-0000-4000-8000-000000000020';
    const idempotencyKey = '00000000-0000-4000-8000-000000000021';
    const dto: SetupSimulationDto = {
      allocationId: 'current_70_savings_30',
    };
    const response = { session: { id: sessionId, status: 'ACTIVE' } };
    usersService.findOrCreateUser.mockResolvedValue({ id: 'user-1' });
    simulationsService.setupSession.mockResolvedValue(response);

    await expect(
      controller.setupSimulation(authUser, sessionId, dto, idempotencyKey),
    ).resolves.toEqual(response);

    expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
    expect(simulationsService.setupSession).toHaveBeenCalledWith(
      'user-1',
      sessionId,
      dto,
      idempotencyKey,
    );
  });

  it('finds the authenticated application user before advancing accessibly', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'supabase-user-1',
      email: 'player@example.com',
    };
    const sessionId = '00000000-0000-4000-8000-000000000030';
    const idempotencyKey = '00000000-0000-4000-8000-000000000031';
    const response = { session: { id: sessionId, currentDay: 1 } };
    usersService.findOrCreateUser.mockResolvedValue({ id: 'user-1' });
    simulationsService.advanceSession.mockResolvedValue(response);

    await expect(
      controller.advanceSimulation(authUser, sessionId, idempotencyKey),
    ).resolves.toEqual(response);

    expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
    expect(simulationsService.advanceSession).toHaveBeenCalledWith(
      'user-1',
      sessionId,
      idempotencyKey,
    );
  });

  it('finds the authenticated application user before paying a fictional obligation', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'supabase-user-1',
      email: 'player@example.com',
    };
    const sessionId = '00000000-0000-4000-8000-000000000040';
    const obligationId = '00000000-0000-4000-8000-000000000041';
    const idempotencyKey = '00000000-0000-4000-8000-000000000042';
    const response = { payment: { obligationId } };
    usersService.findOrCreateUser.mockResolvedValue({ id: 'user-1' });
    simulationsService.payObligation.mockResolvedValue(response);

    await expect(
      controller.paySimulationObligation(
        authUser,
        sessionId,
        obligationId,
        idempotencyKey,
      ),
    ).resolves.toEqual(response);

    expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
    expect(simulationsService.payObligation).toHaveBeenCalledWith(
      'user-1',
      sessionId,
      obligationId,
      idempotencyKey,
    );
  });

  it('finds the authenticated application user before resolving a fictional event', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'supabase-user-1',
      email: 'player@example.com',
    };
    const sessionId = '00000000-0000-4000-8000-000000000050';
    const eventId = '00000000-0000-4000-8000-000000000051';
    const idempotencyKey = '00000000-0000-4000-8000-000000000052';
    const dto: ResolveSimulationEventDto = { optionId: 'payment_plan' };
    const response = { event: { id: eventId, optionId: dto.optionId } };
    usersService.findOrCreateUser.mockResolvedValue({ id: 'user-1' });
    simulationsService.resolveEvent.mockResolvedValue(response);

    await expect(
      controller.resolveSimulationEvent(
        authUser,
        sessionId,
        eventId,
        dto,
        idempotencyKey,
      ),
    ).resolves.toEqual(response);

    expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
    expect(simulationsService.resolveEvent).toHaveBeenCalledWith(
      'user-1',
      sessionId,
      eventId,
      dto,
      idempotencyKey,
    );
  });

  it('finds the authenticated application user before continuing after a result', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'supabase-user-1',
      email: 'player@example.com',
    };
    const sessionId = '00000000-0000-4000-8000-000000000060';
    const idempotencyKey = '00000000-0000-4000-8000-000000000061';
    const response = { session: { id: sessionId, pending: { type: 'NONE' } } };
    usersService.findOrCreateUser.mockResolvedValue({ id: 'user-1' });
    simulationsService.continueSession.mockResolvedValue(response);

    await expect(
      controller.continueSimulation(authUser, sessionId, idempotencyKey),
    ).resolves.toEqual(response);

    expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
    expect(simulationsService.continueSession).toHaveBeenCalledWith(
      'user-1',
      sessionId,
      idempotencyKey,
    );
  });

  it('finds the authenticated application user before pausing a fictional session', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'supabase-user-1',
      email: 'player@example.com',
    };
    const sessionId = '00000000-0000-4000-8000-000000000070';
    const idempotencyKey = '00000000-0000-4000-8000-000000000071';
    const dto: UpdateSimulationStatusDto = { action: 'pause' };
    const response = { session: { id: sessionId, status: 'PAUSED' } };
    usersService.findOrCreateUser.mockResolvedValue({ id: 'user-1' });
    simulationsService.pauseSession.mockResolvedValue(response);

    await expect(
      controller.updateSimulationStatus(
        authUser,
        sessionId,
        dto,
        idempotencyKey,
      ),
    ).resolves.toEqual(response);

    expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
    expect(simulationsService.pauseSession).toHaveBeenCalledWith(
      'user-1',
      sessionId,
      dto,
      idempotencyKey,
    );
  });

  it('finds the authenticated application user before resuming a fictional session', async () => {
    const authUser: AuthUser = {
      supabaseAuthId: 'supabase-user-1',
      email: 'player@example.com',
    };
    const sessionId = '00000000-0000-4000-8000-000000000080';
    const idempotencyKey = '00000000-0000-4000-8000-000000000081';
    const dto: UpdateSimulationStatusDto = { action: 'resume' };
    const response = { session: { id: sessionId, status: 'ACTIVE' } };
    usersService.findOrCreateUser.mockResolvedValue({ id: 'user-1' });
    simulationsService.resumeSession.mockResolvedValue(response);

    await expect(
      controller.updateSimulationStatus(
        authUser,
        sessionId,
        dto,
        idempotencyKey,
      ),
    ).resolves.toEqual(response);

    expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
    expect(simulationsService.resumeSession).toHaveBeenCalledWith(
      'user-1',
      sessionId,
      dto,
      idempotencyKey,
    );
  });
});
