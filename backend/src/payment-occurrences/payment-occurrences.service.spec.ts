import { Test, TestingModule } from '@nestjs/testing';
import { PaymentOccurrencesService } from './payment-occurrences.service';
import { PrismaService } from '../prisma/prisma.service';
import { RewardService } from '../rewards/reward.service';
import {
  NotificationType,
  PaymentOccurrenceStatus,
  PaymentOccurrence,
  UserEventSourceType,
  UserEventType,
  ScoreTier,
} from '@prisma/client';
import { CreditScoreService } from '../credit-score/credit-score.service';

describe('PaymentOccurrencesService', () => {
  let service: PaymentOccurrencesService;
  let transaction: {
    paymentOccurrence: { update: jest.Mock };
    notification: { create: jest.Mock };
    userEvent: { create: jest.Mock };
  };
  let rewardService: {
    advanceStreak: jest.Mock;
    setMascotMood: jest.Mock;
  };

  const mockPrismaService = {
    paymentOccurrence: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const mockCreditScoreService = {
    recalculateAfterOccurrenceStatusChange: jest.fn(),
  };

  const buildOccurrence = (
    overrides: Partial<PaymentOccurrence> = {},
  ): PaymentOccurrence =>
    ({
      userId: 'user-1',
      id: 'occurrence-1',
      scheduleId: 'schedule-1',
      obligationId: 'obligation-1',
      currency: 'ZAR',
      amountDue: 99,
      dueDate: new Date('2026-07-01T00:00:00.000Z'),
      status: PaymentOccurrenceStatus.PENDING,
      sequenceNumber: 1,
      paidAt: null,
      overdueAt: null,
      missedAt: null,
      createdAt: new Date('2026-06-01T00:00:00.000Z'),
      updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      deletedAt: null,
      ...overrides,
    }) as PaymentOccurrence;

  beforeEach(async () => {
    jest.clearAllMocks();
    transaction = {
      paymentOccurrence: { update: jest.fn() },
      notification: { create: jest.fn() },
      userEvent: {
        create: jest.fn().mockResolvedValue({
          id: 'missed-event-1',
        }),
      },
    };
    rewardService = {
      advanceStreak: jest.fn(),
      setMascotMood: jest.fn(),
    };

    mockPrismaService.$transaction.mockImplementation(
      (callback: (tx: typeof transaction) => unknown) => callback(transaction),
    );

    mockCreditScoreService.recalculateAfterOccurrenceStatusChange.mockResolvedValue(
      {
        scoreEventId: 'mock-scoreEventId',
        scoreBefore: 600,
        scoreAfter: 580,
        scoreDelta: -20,
        tierBefore: ScoreTier.GOOD,
        tierAfter: ScoreTier.FAIR,
        explanation: 'Payment overdue.',
        onTimePaymentCount: 0,
        latePaymentCount: 0,
        missedPaymentCount: 0,
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentOccurrencesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RewardService,
          useValue: rewardService,
        },
        {
          provide: CreditScoreService,
          useValue: mockCreditScoreService,
        },
      ],
    }).compile();

    service = module.get<PaymentOccurrencesService>(PaymentOccurrencesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('transitionOverdueOccurrences', () => {
    it('transition pending occurrence to OVERDUE and make a notification', async () => {
      const occurrence = buildOccurrence();

      mockPrismaService.paymentOccurrence.findMany.mockResolvedValue([
        occurrence,
      ]);

      const rslt = await service.transitionOverdueOccurrences();

      expect(transaction.paymentOccurrence.update).toHaveBeenCalledWith({
        where: { id: occurrence.id },
        data: {
          overdueAt: expect.any(Date) as Date,
          status: PaymentOccurrenceStatus.OVERDUE,
        },
      });

      expect(transaction.notification.create).toHaveBeenCalledWith({
        data: {
          userId: occurrence.userId,
          title: 'Payment overdue',
          message: 'Your payment is overdue.',
          type: NotificationType.PAYMENT_STATUS,
          sourceId: occurrence.id,
          sourceType: UserEventSourceType.PAYMENT_OCCURRENCE,
        },
      });
      expect(rslt).toEqual({ transitionedCount: 1 });
    });

    it('will query with the correct filter: PENDING, dueDate < now, not deleted', async () => {
      mockPrismaService.paymentOccurrence.findMany.mockResolvedValue([]);

      await service.transitionOverdueOccurrences();

      expect(mockPrismaService.paymentOccurrence.findMany).toHaveBeenCalledWith(
        {
          where: {
            dueDate: { lt: expect.any(Date) as Date },
            status: PaymentOccurrenceStatus.PENDING,
            deletedAt: null,
          },
        },
      );
    });

    it('returns transitionedCount = 0 and does not do anything when nothing is overdue', async () => {
      mockPrismaService.paymentOccurrence.findMany.mockResolvedValue([]);

      const rslt = await service.transitionOverdueOccurrences();

      expect(rslt).toEqual({ transitionedCount: 0 });
      expect(transaction.paymentOccurrence.update).not.toHaveBeenCalled();
      expect(transaction.notification.create).not.toHaveBeenCalled();
      expect(rewardService.advanceStreak).not.toHaveBeenCalled();
      expect(rewardService.setMascotMood).not.toHaveBeenCalled();
    });

    it('will not transition an occurrence again that was marked OVERDUE previously', async () => {
      const occurrence = buildOccurrence();

      mockPrismaService.paymentOccurrence.findMany.mockResolvedValueOnce([
        occurrence,
      ]);
      const firstRslt = await service.transitionOverdueOccurrences();

      expect(firstRslt).toEqual({ transitionedCount: 1 });
      expect(transaction.notification.create).toHaveBeenCalledTimes(1);

      mockPrismaService.paymentOccurrence.findMany.mockResolvedValueOnce([]);
      const secondRslt = await service.transitionOverdueOccurrences();

      expect(secondRslt).toEqual({ transitionedCount: 0 });
      expect(transaction.notification.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('transitionMissedOccurrence', () => {
    it('transition pending occurrence to MISSED and make a notification', async () => {
      const occurrence = buildOccurrence({
        status: PaymentOccurrenceStatus.OVERDUE,
        overdueAt: new Date('2026-05-01T00:00:00.000Z'),
      });

      mockPrismaService.paymentOccurrence.findMany.mockResolvedValue([
        occurrence,
      ]);

      const rslt = await service.transitionMissedOccurrence();

      expect(transaction.paymentOccurrence.update).toHaveBeenCalledWith({
        where: { id: occurrence.id },
        data: {
          missedAt: expect.any(Date) as Date,
          status: PaymentOccurrenceStatus.MISSED,
        },
      });

      expect(transaction.notification.create).toHaveBeenCalledWith({
        data: {
          userId: occurrence.userId,
          title: 'Payment missed',
          message: 'Your payment was not made, and has been missed.',
          type: NotificationType.PAYMENT_STATUS,
          sourceId: occurrence.id,
          sourceType: UserEventSourceType.PAYMENT_OCCURRENCE,
        },
      });
      expect(rewardService.advanceStreak).toHaveBeenCalledWith(transaction, {
        userId: occurrence.userId,
        field: 'currentPaymentStreak',
        advance: false,
      });
      expect(rewardService.setMascotMood).toHaveBeenCalledWith(transaction, {
        userId: occurrence.userId,
        mood: 'SAD',
        reason: 'Payment occurrence missed',
        sourceEventId: 'missed-event-1',
      });

      expect(transaction.userEvent.create).toHaveBeenCalledWith({
        data: {
          userId: occurrence.userId,
          eventType: UserEventType.PAYMENT_OVERDUE,
          sourceType: UserEventSourceType.PAYMENT_OCCURRENCE,
          sourceId: occurrence.id,
          metadata: {
            occurrenceId: occurrence.id,
            transition: 'MISSED',
          },
        },
      });

      expect(rslt).toEqual({ transitionedCount: 1 });
    });

    it('will query with the correct filter: OVERDUE, overdueAt <= 30 days, not deleted', async () => {
      mockPrismaService.paymentOccurrence.findMany.mockResolvedValue([]);

      await service.transitionMissedOccurrence();

      expect(mockPrismaService.paymentOccurrence.findMany).toHaveBeenCalledWith(
        {
          where: {
            overdueAt: { lte: expect.any(Date) as Date },
            status: PaymentOccurrenceStatus.OVERDUE,
            deletedAt: null,
          },
        },
      );
    });

    it('returns transitionedCount = 0 and does not do anything when threshold passed', async () => {
      mockPrismaService.paymentOccurrence.findMany.mockResolvedValue([]);

      const rslt = await service.transitionMissedOccurrence();

      expect(rslt).toEqual({ transitionedCount: 0 });
      expect(transaction.paymentOccurrence.update).not.toHaveBeenCalled();
      expect(transaction.notification.create).not.toHaveBeenCalled();
      expect(rewardService.advanceStreak).not.toHaveBeenCalled();
      expect(rewardService.setMascotMood).not.toHaveBeenCalled();
    });

    it('will not transition an occurrence again that was marked MISSED previously', async () => {
      const occurrence = buildOccurrence({
        status: PaymentOccurrenceStatus.OVERDUE,
        overdueAt: new Date('2026-05-01T00:00:00.000Z'),
      });

      mockPrismaService.paymentOccurrence.findMany.mockResolvedValueOnce([
        occurrence,
      ]);
      const firstRslt = await service.transitionMissedOccurrence();

      expect(firstRslt).toEqual({ transitionedCount: 1 });
      expect(transaction.notification.create).toHaveBeenCalledTimes(1);

      mockPrismaService.paymentOccurrence.findMany.mockResolvedValueOnce([]);
      const secondRslt = await service.transitionMissedOccurrence();

      expect(secondRslt).toEqual({ transitionedCount: 0 });
      expect(transaction.notification.create).toHaveBeenCalledTimes(1);
    });
  });
});
