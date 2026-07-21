import { ObligationsService } from "./obligations.service";
import { Currency, ObligationStatus, ObligationType, ObligationPriority, ScheduleFrequency, ReminderStatus } from '@prisma/client';
import type { PrismaService } from "../prisma/prisma.service";

describe('ObligationsService', ()=>{
    let prisma: {
        category: {findUnique: jest.Mock};
        $transaction: jest.Mock;
    };

    let service: ObligationsService;

    let transaction: {
        paymentOccurrence: { create: jest.Mock };
        paymentSchedule: { create: jest.Mock };
        userEvent: { create: jest.Mock };
        financialObligation: { create: jest.Mock };
        reminder: { create: jest.Mock };
    };

    const baseDto = {
        name: 'Showmax',
        type: ObligationType.SUBSCRIPTION,
        categoryId: 'category-1',
        amount: 99,
        currency: Currency.ZAR,
        priority: ObligationPriority.LOW,
        startDate: '2026-07-20',
        schedule: { frequency: ScheduleFrequency.ONCE},
    };

    const userId = 'user-1';

    beforeEach(()=>{

        prisma = {
            category: { findUnique: jest.fn().mockResolvedValue({ id: 'category-1' })},

            $transaction: jest.fn().mockImplementation((callback)=>callback(transaction)),
        }


        transaction = {
            
            paymentOccurrence: {
                create: jest.fn().mockResolvedValue({
                    id: 'occurrence-1',
                    amountDue: 99,
                    sequenceNum: 1,
                    status: 'PENDING',
                    dueDate: new Date('2026-08-20'),
                }),
            },

            paymentSchedule: {
                create: jest.fn().mockResolvedValue({
                    id: 'schedule-1'
                }),
            },

            userEvent: {
                create: jest.fn().mockResolvedValue({
                    sourceId: 'obligation-1',
                    sourceType: 'FINANCIAL_OBLIGATION',
                    eventType: 'OBLIGATION_CREATED',
                }),
            },

            financialObligation: {
                create: jest.fn().mockResolvedValue({
                    id: 'obligation-1',
                    name: 'Showmax',
                    priority: ObligationPriority.LOW,
                }),
            },

            reminder: {
                create: jest.fn().mockImplementation((args)=> Promise.resolve({ id: `rem-${Math.random()}`, ...args.data }),)
            },
        };

        service = new ObligationsService(prisma as unknown as PrismaService);
        
    });

    it('create exactly one reminder per occurrence per daysBefore value', async()=>{
        const dto = { ...baseDto, reminders: { enabled: true, daysBefore: [3, 1] }};
        await service.create(userId, dto as any, 3);

        expect(transaction.reminder.create).toHaveBeenCalledTimes(2);
    });

    it('falls back to user preference when no reminders are specified by user', async()=>{
        await service.create(userId, baseDto as any, 7);

        expect(transaction.reminder.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    message: expect.stringContaining(
                        '7 days'
                    ),
                }),
            }),
        );
    });

    it('use obligation override when user specifies preference', async()=>{
        const dto = { ...baseDto, reminders: { enabled: true, daysBefore: [3] }};
        await service.create(userId, dto as any, 7);

        expect(transaction.reminder.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data:expect.objectContaining({
                    message: expect.stringContaining(
                        '3 days'
                    ),
                }),
            }),
        );
    });
});