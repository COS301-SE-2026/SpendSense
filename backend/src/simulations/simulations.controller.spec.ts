import { Test, TestingModule } from '@nestjs/testing';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UsersService } from '../users/users.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import { SimulationsController } from './simulations.controller';
import { SimulationsService } from './simulations.service';

describe('SimulationsController', () => {
  let controller: SimulationsController;
  const usersService = { findOrCreateUser: jest.fn() };
  const simulationsService = { createBriefing: jest.fn() };

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
});
