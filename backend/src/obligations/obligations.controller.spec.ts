import { Test, TestingModule } from '@nestjs/testing';
import {
  Currency,
  ObligationPriority,
  ObligationStatus,
  ObligationType,
  ScheduleFrequency,
} from '@prisma/client';
import { ObligationsController } from './obligations.controller';
import { ObligationsService } from './obligations.service';
import { CreateObligationDto } from './dto/create-obligation.dto';
import { ListObligationsDto } from './dto/list-obligations.dto';
import { UpdateObligationDto } from './dto/update-obligation.dto';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UsersService } from '../users/users.service';

type ObligationsServiceMock = jest.Mocked<
  Pick<ObligationsService, 'create' | 'list' | 'findOne' | 'update' | 'archive'>
>;
type UsersServiceMock = jest.Mocked<Pick<UsersService, 'findOrCreateUser'>>;

const mockAuthUser: AuthUser = {
  supabaseAuthId: 'test-supabase-id',
  email: 'test@spendsense.local',
};

const mockInternalUser = {
  id: 'user-internal-id',
  ...mockAuthUser,
  notificationPreference: { defaultReminderDaysBefore: 3 },
} as Awaited<ReturnType<UsersService['findOrCreateUser']>>;

const mockObligationResult = {
  obligation: {
    id: 'obl-1',
    name: 'Netflix',
    description: null,
    type: ObligationType.SUBSCRIPTION,
    status: ObligationStatus.ACTIVE,
    amount: 199,
    currency: Currency.ZAR,
    priority: ObligationPriority.MEDIUM,
    startDate: new Date('2026-05-01'),
    endDate: null,
    categoryId: 'cat-1',
    userId: mockInternalUser.id,
    deletedAt: null,
    updatedAt: new Date('2026-05-01'),
    category: { id: 'cat-1', name: 'Subscription', iconKey: 'repeat' },
    createdAt: new Date('2026-05-01'),
  },
  schedule: {
    id: 'sch-1',
    obligationId: 'obl-1',
    frequency: ScheduleFrequency.MONTHLY,
    interval: 1,
    dayOfMonth: 15,
    startDate: new Date('2026-05-01'),
    endDate: null,
    totalOccurrences: null,
    isActive: true,
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-01'),
    deletedAt: null,
  },
  generatedOccurrences: [],
  createdReminders: [],
  event: {
    type: 'OBLIGATION_CREATED',
    sourceType: 'FINANCIAL_OBLIGATION',
    sourceId: 'obl-1',
  },
  rewards: {
    xpAwarded: 15,
    xp: 15,
    mascotLevel: 1,
    leveledUp: false,
  },
} as Awaited<ReturnType<ObligationsService['create']>>;

describe('ObligationsController', () => {
  let controller: ObligationsController;
  let obligationsService: ObligationsServiceMock;
  let usersService: UsersServiceMock;

  beforeEach(async () => {
    obligationsService = {
      create: jest.fn(),
      list: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      archive: jest.fn(),
    };
    usersService = {
      findOrCreateUser: jest.fn().mockResolvedValue(mockInternalUser),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ObligationsController],
      providers: [
        {
          provide: ObligationsService,
          useValue: obligationsService,
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

    controller = module.get<ObligationsController>(ObligationsController);
  });

  describe('create()', () => {
    it('resolves the internal user and calls obligationsService.create', async () => {
      obligationsService.create.mockResolvedValue(mockObligationResult);

      const dto: CreateObligationDto = {
        name: 'Netflix',
        type: ObligationType.SUBSCRIPTION,
        categoryId: 'cat-1',
        amount: 199,
        currency: Currency.ZAR,
        priority: ObligationPriority.MEDIUM,
        startDate: '2026-05-01',
        schedule: {
          frequency: ScheduleFrequency.MONTHLY,
          interval: 1,
          dayOfMonth: 15,
        },
      };

      const result = await controller.create(mockAuthUser, dto);

      expect(usersService.findOrCreateUser).toHaveBeenCalledWith(mockAuthUser);
      expect(obligationsService.create).toHaveBeenCalledWith(
        mockInternalUser.id,
        dto,
        3,
      );
      expect(result).toEqual(mockObligationResult);
    });
  });

  describe('list()', () => {
    it("returns only the authenticated user's obligations", async () => {
      const listResult = {
        data: [mockObligationResult.obligation],
        meta: { page: 1, perPage: 20, total: 1, totalPages: 1 },
      } as Awaited<ReturnType<ObligationsService['list']>>;

      obligationsService.list.mockResolvedValue(listResult);

      const query: ListObligationsDto = { page: 1, perPage: 20 };
      const result = await controller.list(mockAuthUser, query);

      expect(obligationsService.list).toHaveBeenCalledWith(
        mockInternalUser.id,
        query,
      );
      expect(result).toEqual(listResult);
    });
  });

  describe('findOne()', () => {
    it('returns the obligation detail for the authenticated user', async () => {
      const detailResult = {
        data: mockObligationResult,
      } as Awaited<ReturnType<ObligationsService['findOne']>>;
      obligationsService.findOne.mockResolvedValue(detailResult);

      const result = await controller.findOne(mockAuthUser, 'obl-1');

      expect(obligationsService.findOne).toHaveBeenCalledWith(
        mockInternalUser.id,
        'obl-1',
      );
      expect(result).toBeDefined();
    });
  });

  describe('update()', () => {
    it('updates the obligation and returns the result', async () => {
      const updateResult = {
        data: {
          obligation: {
            id: 'obl-1',
            name: 'Netflix Premium',
            amount: 229,
            updatedAt: new Date('2026-05-20'),
          },
          futureOccurrencesRegenerated: false,
        },
      } as Awaited<ReturnType<ObligationsService['update']>>;
      obligationsService.update.mockResolvedValue(updateResult);

      const dto: UpdateObligationDto = { name: 'Netflix Premium', amount: 229 };
      const result = await controller.update(mockAuthUser, 'obl-1', dto);

      expect(obligationsService.update).toHaveBeenCalledWith(
        mockInternalUser.id,
        'obl-1',
        dto,
      );
      expect(result).toEqual(updateResult);
    });
  });

  describe('archive()', () => {
    it('archives the obligation and returns cancelled occurrence count', async () => {
      const archiveResult = {
        data: {
          id: 'obl-1',
          status: 'CANCELLED',
          deletedAt: new Date('2026-05-20'),
          futureOccurrencesCancelled: 3,
        },
      };
      obligationsService.archive.mockResolvedValue(archiveResult);

      const result = await controller.archive(mockAuthUser, 'obl-1');

      expect(obligationsService.archive).toHaveBeenCalledWith(
        mockInternalUser.id,
        'obl-1',
      );
      expect(result).toEqual(archiveResult);
    });
  });
});
