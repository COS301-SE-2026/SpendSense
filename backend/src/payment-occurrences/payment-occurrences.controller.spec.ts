import { Test, TestingModule } from '@nestjs/testing';
import { PaymentOccurrenceStatus } from '@prisma/client';
import { PaymentOccurrencesController } from './payment-occurrences.controller';
import { PaymentOccurrencesService } from './payment-occurrences.service';
import { UpcomingOccurrencesDto } from './dto/upcoming-occurrences.dto';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UsersService } from '../users/users.service';

type PaymentOccurrencesServiceMock = jest.Mocked<
  Pick<PaymentOccurrencesService, 'upcoming' | 'findOne'>
>;
type UsersServiceMock = jest.Mocked<Pick<UsersService, 'findOrCreateUser'>>;

const mockAuthUser: AuthUser = {
  supabaseAuthId: 'test-supabase-id',
  email: 'test@spendsense.local',
};

const mockInternalUser = { id: 'user-internal-id', ...mockAuthUser } as Awaited<
  ReturnType<UsersService['findOrCreateUser']>
>;

describe('PaymentOccurrencesController', () => {
  let controller: PaymentOccurrencesController;
  let occurrencesService: PaymentOccurrencesServiceMock;
  let usersService: UsersServiceMock;

  beforeEach(async () => {
    occurrencesService = {
      upcoming: jest.fn(),
      findOne: jest.fn(),
    };
    usersService = {
      findOrCreateUser: jest.fn().mockResolvedValue(mockInternalUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentOccurrencesController],
      providers: [
        {
          provide: PaymentOccurrencesService,
          useValue: occurrencesService,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
      ],
    })
      .overrideGuard(SupabaseJwtGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentOccurrencesController>(
      PaymentOccurrencesController,
    );
  });

  describe('upcoming()', () => {
    it("returns only the authenticated user's pending/overdue occurrences sorted by dueDate", async () => {
      const upcomingResult = {
        data: [
          {
            id: 'occ-1',
            dueDate: new Date('2026-06-01'),
            amountDue: 199,
            status: PaymentOccurrenceStatus.PENDING,
            daysUntilDue: 13,
            riskLevel: 'LOW',
            obligation: {
              id: 'obl-1',
              name: 'Netflix',
              type: 'SUBSCRIPTION',
              priority: 'MEDIUM',
            },
            reminders: [],
          },
        ],
        meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
      } as Awaited<ReturnType<PaymentOccurrencesService['upcoming']>>;
      occurrencesService.upcoming.mockResolvedValue(upcomingResult);

      const query: UpcomingOccurrencesDto = { page: 1, perPage: 20 };
      const result = await controller.upcoming(mockAuthUser, query);

      expect(usersService.findOrCreateUser).toHaveBeenCalledWith(mockAuthUser);
      expect(occurrencesService.upcoming).toHaveBeenCalledWith(
        mockInternalUser.id,
        query,
      );
      expect(result).toEqual(upcomingResult);
    });
  });

  describe('findOne()', () => {
    it('returns the occurrence detail for the authenticated user', async () => {
      const detailResult = {
        data: {
          occurrence: { id: 'occ-1', status: PaymentOccurrenceStatus.PENDING },
          obligation: { id: 'obl-1', name: 'Netflix' },
          paymentRecord: null,
          scoreRisk: {
            estimatedPenaltyIfMissed: -12,
            estimatedPenaltyIfLate: -5,
            explanation:
              'Late or missed payments can reduce your simulated financial health score.',
          },
          reminders: [],
        },
      } as Awaited<ReturnType<PaymentOccurrencesService['findOne']>>;
      occurrencesService.findOne.mockResolvedValue(detailResult);

      const result = await controller.findOne(mockAuthUser, 'occ-1');

      expect(occurrencesService.findOne).toHaveBeenCalledWith(
        mockInternalUser.id,
        'occ-1',
      );
      expect(result).toEqual(detailResult);
    });
  });
});
