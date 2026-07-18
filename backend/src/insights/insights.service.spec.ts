import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InsightsService } from './insights.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentOccurrenceStatus } from '@prisma/client';

describe('InsightsService', () => {
    let service: InsightsService;

    const prismaMock = {
        user: { findUnique: jest.fn() },
        paymentOccurrence: { findMany: jest.fn(), count: jest.fn() },
        $transaction: jest.fn(),
    };

    const fixedDate = new Date("2026-07-18T12:00:00.000Z");

    beforeEach(async () => {
        jest.useFakeTimers();
        jest.setSystemTime(fixedDate);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InsightsService,
                {
                    provide: PrismaService,
                    useValue: prismaMock,
                },
            ],
        }).compile();
        service = module.get<InsightsService>(InsightsService);
        jest.clearAllMocks();
    });

    afterEach(() => { jest.useRealTimers(); })

    //////// Resolving the userId - make sure it works.
    describe('resolveUserId', () => {

        it('Successfully Return the internal user ID when the user exists', async () => {
            const supabaseAuthId = 'supabase-user-123';
            const internalUserId = 'internal-user-456';
            prismaMock.user.findUnique.mockResolvedValue({ id: internalUserId });
            const result = await service['resolveUserId'](supabaseAuthId);
            expect(result).toBe(internalUserId);
            expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
                where: {
                    supabaseAuthId,
                },
                select: {
                    id: true,
                },
            });
            expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
        });

        it('Successfulyy throw NotFoundException when the user does not exist', async () => {
            const supabaseAuthId = 'unknown-supabase-user';
            prismaMock.user.findUnique.mockResolvedValue(null);
            await expect(service['resolveUserId'](supabaseAuthId)).rejects.toThrow(NotFoundException);
            await expect(service['resolveUserId'](supabaseAuthId)).rejects.toThrow("SpendSense user profile could not be found");
        });
    });

    ///////// test get getSettledPayments ====================================================
    describe('getSettledPayments', () => {

        it('Return all SETTLED payments for the current user', async () => {
            const supabaseAuthId = 'supabase-user-123';
            const internalUserId = 'internal-user-456';
            const dueDate = new Date('2026-07-01T00:00:00.000Z');
            const paidAt = new Date('2026-06-30T00:00:00.000Z');
            const paidDate = new Date('2026-06-30T00:00:00.000Z');
            prismaMock.user.findUnique.mockResolvedValue({ id: internalUserId });
            prismaMock.paymentOccurrence.findMany.mockResolvedValue(
                [
                    // FIRST PAYMENT OCCURANCE
                    {
                        id: 'occurrence-1',
                        obligationId: 'obligation-1',
                        dueDate,
                        amountDue: 5200,
                        currency: 'ZAR',
                        status: PaymentOccurrenceStatus.PAID,
                        sequenceNumber: 4,
                        paidAt,
                        obligation: { // OBLIGATION ID FOR THAT PAYMENT OCCURANCE
                            id: 'obligation-1',
                            name: 'Monthly Rent',
                            description: 'Apartment rent',
                            type: 'RENT',
                            status: 'ACTIVE',
                            priority: 'CRITICAL',
                            amount: 5200,
                            currency: 'ZAR',
                            category: {
                                id: 'category-1',
                                name: 'Rent',
                                iconKey: 'rent',
                                colourKey: null,
                            },
                        },
                        payment: {
                            id: 'payment-1', // PAYMENT ID FOR THAT PAYMENT OCCURANCE SINCE ITS * SETTLED *
                            amountPaid: 5200,
                            paidDate,
                            paymentStatus: 'ON_TIME',
                            daysLate: 0,
                            simulatedInterest: 0,
                            notes: 'Paid on time',
                        },
                    },

                    // SECOND PAYMENT OCCURANCE - THIS IS PAYED LATE BUT SHOULD STILL BE RETURNED
                    {
                        id: 'occurrence-2',
                        obligationId: 'obligation-2',
                        dueDate: new Date('2026-06-15T00:00:00.000Z'),
                        amountDue: 850,
                        currency: 'ZAR',
                        status: PaymentOccurrenceStatus.PAID_LATE,
                        sequenceNumber: 2,
                        paidAt: new Date('2026-06-18T00:00:00.000Z'),
                        obligation: {
                            id: 'obligation-2',
                            name: 'Internet',
                            description: 'Monthly internet payment',
                            type: 'SUBSCRIPTION',
                            status: 'ACTIVE',
                            priority: 'HIGH',
                            amount: 850,
                            currency: 'ZAR',
                            category: {
                                id: 'category-2',
                                name: 'Utilities',
                                iconKey: 'wifi',
                                colourKey: null,
                            },
                        },
                        payment: {
                            id: 'payment-2',
                            amountPaid: 850,
                            paidDate: new Date('2026-06-18T00:00:00.000Z'),
                            paymentStatus: 'LATE',
                            daysLate: 3,
                            simulatedInterest: 12.5,
                            notes: 'Paid three days late',
                        },
                    },
                ]);

            const result = await service.getSettledPayments(supabaseAuthId);

            expect(result.count).toBe(2);
            expect(result.payments).toHaveLength(2);
            expect(result.payments[0]).toEqual(
                {
                    id: 'occurrence-1',
                    obligationId: 'obligation-1',
                    dueDate,
                    amountDue: 5200,
                    currency: 'ZAR',
                    status: PaymentOccurrenceStatus.PAID,
                    sequenceNumber: 4,
                    paidAt,
                    obligation: {
                        id: 'obligation-1',
                        name: 'Monthly Rent',
                        description: 'Apartment rent',
                        type: 'RENT',
                        status: 'ACTIVE',
                        priority: 'CRITICAL',
                        amount: 5200,
                        currency: 'ZAR',
                        category: {
                            id: 'category-1',
                            name: 'Rent',
                            iconKey: 'rent',
                            colourKey: null,
                        },
                    },
                    payment: {
                        id: 'payment-1',
                        amountPaid: 5200,
                        paidDate,
                        paymentStatus: 'ON_TIME',
                        daysLate: 0,
                        simulatedInterest: 0,
                        notes: 'Paid on time',
                    },
                }
            );

            expect(prismaMock.user.findUnique,).toHaveBeenCalledWith(
                {
                    where: { supabaseAuthId },
                    select: { id: true },
                }
            );

            expect(prismaMock.paymentOccurrence.findMany).toHaveBeenCalledWith(
                {
                    where: {
                        userId: internalUserId,
                        deletedAt: null,
                        status: { in: [PaymentOccurrenceStatus.PAID, PaymentOccurrenceStatus.PAID_LATE] },
                        obligation: { is: { deletedAt: null }, },
                    },

                    select: {
                        id: true,
                        obligationId: true,
                        dueDate: true,
                        amountDue: true,
                        currency: true,
                        status: true,
                        sequenceNumber: true,
                        paidAt: true,
                        obligation: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                type: true,
                                status: true,
                                priority: true,
                                amount: true,
                                currency: true,
                                category: {
                                    select: {
                                        id: true,
                                        name: true,
                                        iconKey: true,
                                        colourKey: true,
                                    },
                                },
                            },
                        },
                        payment: {
                            select: {
                                id: true,
                                amountPaid: true,
                                paidDate: true,
                                paymentStatus: true,
                                daysLate: true,
                                simulatedInterest: true,
                                notes: true,
                            },
                        },
                    },
                    orderBy: [{ paidAt: 'desc' }, { dueDate: 'desc' }],
                }
            );

        });
    });
    
    describe('getSettlementRate', () => {
        it('Calculate percentage of settled payments', async () => {
            const supabaseAuthId = 'supabase-user-123';
            const userId = 'internal-user-456';
            prismaMock.user.findUnique.mockResolvedValue({ id: userId });
            const eligibleCountQuery = Promise.resolve(8);
            const settledCountQuery = Promise.resolve(6);
            prismaMock.paymentOccurrence.count.mockReturnValueOnce(eligibleCountQuery).mockReturnValueOnce(settledCountQuery);
            prismaMock.$transaction.mockResolvedValue([8, 6]); // Eight DUE payments  - six of them == SETTLED
            const result = await service.getSettlementRate(supabaseAuthId);
            expect(result).toEqual(
                {
                    asOf: '2026-07-18T12:00:00.000Z',
                    settledPaymentCount: 6,
                    unsettledPaymentCount: 2,
                    eligiblePaymentCount: 8,
                    settlementPercentage: 75,
                    hasEnoughData: true,
                }
            );
            expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
                {
                    where: { supabaseAuthId },
                    select: { id: true },
                }
            );
            expect(prismaMock.paymentOccurrence.count).toHaveBeenNthCalledWith(1,
                {
                    where: {
                        userId,
                        deletedAt: null,
                        dueDate: { lte: fixedDate },
                        status: { not: PaymentOccurrenceStatus.CANCELLED },
                        obligation: { is: { deletedAt: null } },
                    },
                }
            );
            expect(prismaMock.paymentOccurrence.count).toHaveBeenNthCalledWith(2,
                {
                    where: {
                        userId,
                        deletedAt: null,
                        dueDate: { lte: fixedDate },
                        status: { in: [PaymentOccurrenceStatus.PAID, PaymentOccurrenceStatus.PAID_LATE] },
                        obligation: { is: { deletedAt: null } },
                    },
                }
            );
            expect(prismaMock.$transaction).toHaveBeenCalledWith([eligibleCountQuery, settledCountQuery]);
        });

    });
});