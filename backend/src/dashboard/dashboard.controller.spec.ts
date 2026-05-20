import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { UsersService } from '../users/users.service';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import '@jest/globals';
import { jest } from '@jest/globals';

const mockAuthUser: AuthUser = {
	supabaseAuthId: 'test-supabase-id',
	email: 'test@spendsense.local',
};

const mockInternalUser = {
	id: 'user-internal-id',
	supabaseAuthId: 'test-supabase-id',
	email: 'test@spendsense.local',
};

const mockDashboardResult = {
	userId: mockInternalUser.id,
	summary: {
		totalObligations: 3,
		upcomingPayments: 2,
		overduePayments: 1,
	},
	upcomingPayments: [
		{
			id: 'occ-1',
			amountDue: 750,
			dueDate: new Date('2026-05-25'),
			status: 'PENDING',
		},
	],
};

describe('DashboardController', () => {
	let controller: DashboardController;

	const mockDashboardService = {
		getDashboard: jest.fn(),
	};

	const mockUsersService = {
		findOrCreateUser: jest.fn(),
	};

	beforeEach(async () => {
		jest.clearAllMocks();

		const module: TestingModule = await Test.createTestingModule({
			controllers: [DashboardController],
			providers: [
				{
					provide: DashboardService,
					useValue: mockDashboardService,
				},
				{
					provide: UsersService,
					useValue: mockUsersService,
				},
			],
		})
			.overrideGuard(SupabaseJwtGuard)
			.useValue({ canActivate: () => true })
			.compile();

		controller = module.get<DashboardController>(DashboardController);
	});

	it('should be defined', () => {
		expect(controller).toBeDefined();
	});

});