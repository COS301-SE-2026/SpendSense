import {
  Currency,
  ObligationPriority,
  ObligationType,
  ScheduleFrequency,
} from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { BadgeEngineService } from '../gamification/badge-engine.service';
import { CreateObligationDto } from './dto/create-obligation.dto';
import { ObligationsService } from './obligations.service';

describe('ObligationsService', () => {
  let prisma: {
    category: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: ObligationsService;
  let badgeEngineService: {
    evaluateObligationBadges: jest.Mock;
  };
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
    schedule: {
      frequency: ScheduleFrequency.ONCE,
    },
  };

  const userId = 'user-1';

  // Far enough out that dueDate minus the largest daysBefore used below
  // (7) is still in the future no matter when this suite runs.
  const occurrenceDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  beforeEach(() => {
    transaction = {
      paymentOccurrence: {
        create: jest.fn().mockResolvedValue({
          id: 'occurrence-1',
          amountDue: 99,
          sequenceNum: 1,
          status: 'PENDING',
          dueDate: occurrenceDueDate,
        }),
      },
      paymentSchedule: {
        create: jest.fn().mockResolvedValue({
          id: 'schedule-1',
        }),
      },
      userEvent: {
        create: jest.fn().mockResolvedValue({
          id: 'obligation-event-1',
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
        create: jest
          .fn()
          .mockImplementation((args: { data: Record<string, unknown> }) =>
            Promise.resolve({
              id: `rem-${Math.random()}`,
              ...args.data,
            }),
          ),
      },
    };
    prisma = {
      category: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'category-1',
        }),
      },
      $transaction: jest
        .fn()
        .mockImplementation((callback: (tx: typeof transaction) => unknown) =>
          callback(transaction),
        ),
    };
    badgeEngineService = {
      evaluateObligationBadges: jest.fn().mockResolvedValue([]),
    };
    service = new ObligationsService(
      prisma as unknown as PrismaService,
      badgeEngineService as unknown as BadgeEngineService,
    );
  });

  it('create exactly one reminder per occurrence per daysBefore value', async () => {
    const dto = {
      ...baseDto,
      reminders: {
        enabled: true,
        daysBefore: [3, 1],
      },
    };
    await service.create(userId, dto as CreateObligationDto, 3);
    expect(transaction.reminder.create).toHaveBeenCalledTimes(2);
  });

  it('falls back to user preference when no reminders are specified by user', async () => {
    await service.create(userId, baseDto as CreateObligationDto, 7);
    expect(transaction.reminder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          message: expect.stringContaining('7 days') as string,
        }) as unknown,
      }),
    );
  });

  it('use obligation override when user specifies preference', async () => {
    const dto = {
      ...baseDto,
      reminders: {
        enabled: true,
        daysBefore: [3],
      },
    };
    await service.create(userId, dto as CreateObligationDto, 7);
    expect(transaction.reminder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          message: expect.stringContaining('3 days') as string,
        }) as unknown,
      }),
    );
  });

  it('evaluates obligation badges after creating an obligation', async () => {
    await service.create(userId, baseDto as CreateObligationDto, 7);
    expect(badgeEngineService.evaluateObligationBadges).toHaveBeenCalledTimes(
      1,
    );
    expect(badgeEngineService.evaluateObligationBadges).toHaveBeenCalledWith(
      {
        userId,
        sourceEventId: 'obligation-event-1',
      },
      transaction,
    );
  });

  it('does not evaluate obligation badges when obligation creation fails', async () => {
    transaction.financialObligation.create.mockRejectedValue(
      new Error('Obligation creation failed'),
    );
    await expect(
      service.create(userId, baseDto as CreateObligationDto, 7),
    ).rejects.toThrow('Obligation creation failed');
    expect(badgeEngineService.evaluateObligationBadges).not.toHaveBeenCalled();
  });
});
