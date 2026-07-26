import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users/users.service';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import type { AuthUser } from '../auth/types/auth-user.type';

describe('InsightsController', () => {
  let controller: InsightsController;
  let insightsService: { getInsights: jest.Mock };
  let usersService: { findOrCreateUser: jest.Mock };

  beforeEach(async () => {
    insightsService = { getInsights: jest.fn() };
    usersService = { findOrCreateUser: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InsightsController],
      providers: [
        {
          provide: InsightsService,
          useValue: insightsService,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    }).compile();

    controller = module.get<InsightsController>(InsightsController);
  });

  it('Return combinde insights for the authenticated user', async () => {
    const authUser = {
      supabaseAuthId: 'supabase-user-123',
      email: 'demo@example.com',
    } as AuthUser;

    const response = {
      asOf: '2026-07-20T12:00:00.000Z',
      insights: [],
    };

    usersService.findOrCreateUser.mockResolvedValue({
      id: 'internal-user-456',
    });
    insightsService.getInsights.mockResolvedValue(response);

    await expect(controller.getInsights(authUser)).resolves.toEqual(response);
    expect(insightsService.getInsights).toHaveBeenCalledWith(
      'internal-user-456',
    );
  });
});
