import {Test, TestingModule} from '@nestjs/testing';
import {PaymentOccurrencesController} from './payment-occurrences.controller';
import {PaymentOccurrencesService} from './payment-occurrences.service';
import {UsersService} from '../users/users.service';
import {SupabaseJwtGuard} from '../auth/guards/supabase-jwt.guard';
import {PaymentOccurrenceStatus} from '@prisma/client';
import type {AuthUser} from '../auth/types/auth-user.type';

const mockAuthUser: AuthUser={
    supabaseAuthId: 'test-supabase-id',
    email: 'test@spendsense.local',
};

const mockInternalUser = {id: 'user-internal-id', ...mockAuthUser};

describe('PaymentOccurrencesController', ()=>{
    let controller: PaymentOccurrencesController;
    let occurrencesService: jest.Mocked<PaymentOccurrencesService>;
    let usersService: jest.Mocked<UsersService>;

    beforeEach(async()=>{
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PaymentOccurrencesController],
            providers:[{
                provide: PaymentOccurrencesService,
                useValue:{
                    upcoming: jest.fn(),
                    findOne: jest.fn(),
                    findOwnedOccurrenceOrThrow: jest.fn(),
                    assertOccurrencePayable: jest.fn(),
                    markOccurrencePaid: jest.fn(),},
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
        .useValue({ canActivate: ()=>true })
        .compile();

        controller = module.get<PaymentOccurrencesController>(PaymentOccurrencesController);
        occurrencesService = module.get(PaymentOccurrencesService);
        usersService = module.get(UsersService);
    });

    describe('upcoming()', ()=>{
        it("returns only the authenticated user's pending/overdue occurrences sorted by dueDate", async()=>{
            const upcomingResult ={
                data:[{
                    id: 'occ-1',
                    dueDate: new Date('2026-06-01'),
                    amountDue: 199,
                    status: PaymentOccurrenceStatus.PENDING,
                    daysUntilDue: 13,
                    riskLevel: 'LOW',
                    obligation: {id: 'obl-1', name: 'Netflix', type: 'SUBSCRIPTION', priority: 'MEDIUM'},
                    reminders: [],
                },
                ],

                meta: {page: 1, perPage: 20, total: 1, totalPages: 1},
            };
            occurrencesService.upcoming.mockResolvedValue(upcomingResult as any);

            const result = await controller.upcoming(mockAuthUser, {page: 1, perPage: 20} as any);

            expect(usersService.findOrCreateUser).toHaveBeenCalledWith(mockAuthUser);
            expect(occurrencesService.upcoming).toHaveBeenCalledWith(mockInternalUser.id,{
                page: 1,
                perPage: 20,
            });

            expect(result).toEqual(upcomingResult);
        });
    });

    describe('findOne()', ()=>{
        it('returns the occurrence detail for the authenticated user', async ()=>{
        const detailResult={
            data:{
            occurrence: {id: 'occ-1', status: PaymentOccurrenceStatus.PENDING},
            obligation: {id: 'obl-1', name: 'Netflix'},
            paymentRecord: null,
            scoreRisk:{
                estimatedPenaltyIfMissed: -12,
                estimatedPenaltyIfLate: -5,
                explanation:
                'Late or missed payments can reduce your simulated financial health score.',
            },

            reminders: [],
            },
        };
        occurrencesService.findOne.mockResolvedValue(detailResult as any);

        const result = await controller.findOne(mockAuthUser, 'occ-1');

        expect(occurrencesService.findOne).toHaveBeenCalledWith(mockInternalUser.id, 'occ-1');
        expect(result).toEqual(detailResult);
        });
    });
});