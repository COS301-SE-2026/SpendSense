import {Test, TestingModule} from '@nestjs/testing';
import {ObligationsController} from './obligations.controller';
import {ObligationsService} from './obligations.service';
import {UsersService} from '../users/users.service';
import {SupabaseJwtGuard} from '../auth/guards/supabase-jwt.guard';
import{
  Currency,
  ObligationPriority,
  ObligationStatus,
  ObligationType,
  ScheduleFrequency,
}from '@prisma/client';
import type {AuthUser} from '../auth/types/auth-user.type';
import '@jest/globals';
import { jest } from '@jest/globals';

const mockAuthUser: AuthUser ={
    supabaseAuthId: 'test-supabase-id',
    email: 'test@spendsense.local',
};

const mockInternalUser = {id: 'user-internal-id', ...mockAuthUser};

const mockObligationResult ={
    obligation:{
        id: 'obl-1',
        name: 'Netflix',
        type: ObligationType.SUBSCRIPTION,
        status: ObligationStatus.ACTIVE,
        amount: 199,
        currency: Currency.ZAR,
        priority: ObligationPriority.MEDIUM,
        category: {id: 'cat-1', name: 'Subscription', iconKey: 'repeat'},
        createdAt: new Date(),
    },
    schedule:{
        id: 'sch-1',
        frequency: ScheduleFrequency.MONTHLY,
        interval: 1,
        dayOfMonth: 15,
        isActive: true,
    },
    generatedOccurrences:[],
    createdReminders:[],
    event: {type: 'OBLIGATION_CREATED', sourceType: 'FINANCIAL_OBLIGATION', sourceId: 'obl-1'},
};

describe('ObligationsController', ()=>{
    let controller: ObligationsController;
    let obligationsService: jest.Mocked<ObligationsService>;
    let usersService: jest.Mocked<UsersService>;

    beforeEach(async ()=>{
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ObligationsController],
            providers:[
                {
                    provide: ObligationsService,
                    useValue:{
                        create: jest.fn(),
                        list: jest.fn(),
                        findOne: jest.fn(),
                    },
                },

                {
                    provide: UsersService,
                    useValue:{
                        findOrCreateUser: jest.fn().mockResolvedValue(mockInternalUser),
                    },
                },
            ],
        })
        .overrideGuard(SupabaseJwtGuard)
        .useValue({canActivate: ()=>true})
        .compile();

        controller = module.get<ObligationsController>(ObligationsController);
        obligationsService = module.get(ObligationsService);
        usersService = module.get(UsersService);
    });

    describe('create()', ()=>{
        it('resolves the internal user and calls obligationsService.create', async ()=>{
            obligationsService.create.mockResolvedValue(mockObligationResult as any);

            const dto ={
                name: 'Netflix',
                type: ObligationType.SUBSCRIPTION,
                categoryId: 'cat-1',
                amount: 199,
                currency: Currency.ZAR,
                priority: ObligationPriority.MEDIUM,
                startDate: '2026-05-01',
                schedule: {frequency: ScheduleFrequency.MONTHLY, interval: 1, dayOfMonth: 15},
            };

            const result = await controller.create(mockAuthUser, dto as any);

            expect(usersService.findOrCreateUser).toHaveBeenCalledWith(mockAuthUser);
            expect(obligationsService.create).toHaveBeenCalledWith(mockInternalUser.id, dto);
            expect(result).toEqual(mockObligationResult);
        });
    });

    describe('list()', ()=>{
        it("returns only the authenticated user's obligations", async ()=>{
            const listResult ={
                data: [mockObligationResult.obligation],
                meta: {page: 1, perPage: 20, total: 1, totalPages: 1},
            };

            obligationsService.list.mockResolvedValue(listResult as any);

            const result = await controller.list(mockAuthUser, {page: 1, perPage: 20} as any);

            expect(obligationsService.list).toHaveBeenCalledWith(mockInternalUser.id,{
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(listResult);
        });
    });

    describe('findOne()', ()=>{
        it('returns the obligation detail for the authenticated user', async ()=>{
            obligationsService.findOne.mockResolvedValue({data: mockObligationResult} as any);

            const result = await controller.findOne(mockAuthUser, 'obl-1');

            expect(obligationsService.findOne).toHaveBeenCalledWith(mockInternalUser.id, 'obl-1');
            expect(result).toBeDefined();
        });
    });
});