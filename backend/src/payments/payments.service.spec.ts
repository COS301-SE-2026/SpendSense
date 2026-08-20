import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  Currency,
  MascotMood,
  NotificationType,
  PaymentOccurrenceStatus,
  PaymentRecordStatus,
  Prisma,
  ScoreEventType,
  ScoreTier,
  UserEventSourceType,
  UserEventType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LogPaymentDto } from './dto/log-payment.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { BadgeEngineService } from '../gamification/badge-engine.service';
import { RewardService } from '../rewards/reward.service';

// to run the tests in this file by itself: npm test -- payments.service.spec.ts
type PrismaMockMethod = jest.Mock<Promise<unknown>, [unknown]>;
type TransactionCallback = (tx: PaymentsPrismaMock) => Promise<unknown>;

type PaymentsPrismaMock = {
  paymentOccurrence: {
    findFirst: PrismaMockMethod;
    update: PrismaMockMethod;
  };
  paymentRecord: {
    create: PrismaMockMethod;
  };
  userEvent: {
    create: PrismaMockMethod;
  };
  creditProfile: {
    upsert: PrismaMockMethod;
    update: PrismaMockMethod;
  };
  scoreEvent: {
    create: PrismaMockMethod;
  };
  gamificationProfile: {
    upsert: PrismaMockMethod;
    update: PrismaMockMethod;
  };
  rewardTransaction: {
    create: PrismaMockMethod;
  };
  $transaction: jest.Mock<Promise<unknown>, [TransactionCallback]>;
};

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockPrismaService: PaymentsPrismaMock;

  const mockNotificationsService: {
    create: jest.Mock<Promise<unknown>, [unknown, unknown?]>;
  } = {
    create: jest.fn<Promise<unknown>, [unknown, unknown?]>(),
  };

  mockNotificationsService.create.mockResolvedValue({
    id: 'notification-1',
  });

  const mockBadgeEngineService: {
    evaluatePaymentBadges: jest.Mock<Promise<string[]>, [unknown, unknown]>;
  } = {
    evaluatePaymentBadges: jest.fn<Promise<string[]>, [unknown, unknown]>(),
  };

  const currentUserId = 'user-id';

  // this is what is a PaymentOccurance that is expected of the user
  const baseOccurrence = {
    id: 'baseOccurrence-id',
    userId: currentUserId,
    obligationId: 'obligation-id',
    scheduleId: 'schedule-id',
    dueDate: new Date('2026-05-20T00:00:00.000Z'),
    amountDue: new Prisma.Decimal(751.83),
    currency: Currency.ZAR,
    status: PaymentOccurrenceStatus.PENDING,
    sequenceNumber: 1,
    paidAt: null,
    overdueAt: null,
    missedAt: null,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    deletedAt: null,
    obligation: {
      name: 'Mock obligation',
    },
  };

  // this is the dto that's being sent from the front end (what the user ented)
  const baseDto: LogPaymentDto = {
    occurrenceId: 'baseOccurrence-id',
    paidDate: '2026-05-19',
    amountPaid: 751.83,
    notes: 'mocked base dto objects notes',
  };

  const basePaymentRecord = {
    id: 'payment-record-1',
    userId: baseOccurrence.userId,
    occurrenceId: baseOccurrence.id,
    obligationId: baseOccurrence.obligationId,
    amountPaid: new Prisma.Decimal(baseDto.amountPaid),
    currency: Currency.ZAR,
    paidDate: new Date(baseDto.paidDate),
    paymentStatus: PaymentRecordStatus.ON_TIME,
    daysLate: 0,
    simulatedInterest: new Prisma.Decimal(0),
    notes: baseDto.notes,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    mockPrismaService = {
      paymentOccurrence: {
        findFirst: jest.fn<Promise<unknown>, [unknown]>(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
      },
      paymentRecord: {
        create: jest.fn<Promise<unknown>, [unknown]>(),
      },
      userEvent: {
        create: jest.fn<Promise<unknown>, [unknown]>(),
      },
      creditProfile: {
        upsert: jest.fn<Promise<unknown>, [unknown]>(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
      },
      scoreEvent: {
        create: jest.fn<Promise<unknown>, [unknown]>(),
      },
      gamificationProfile: {
        upsert: jest.fn<Promise<unknown>, [unknown]>(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
      },
      rewardTransaction: {
        create: jest.fn<Promise<unknown>, [unknown]>(),
      },
      $transaction: jest.fn<Promise<unknown>, [TransactionCallback]>(),
    };

    jest.clearAllMocks();
    mockBadgeEngineService.evaluatePaymentBadges.mockResolvedValue([]);
    mockPrismaService.$transaction.mockImplementation((callback) =>
      callback(mockPrismaService),
    );
    mockPrismaService.userEvent.create.mockResolvedValue({
      id: 'payment-event-1',
      userId: currentUserId,
      eventType: UserEventType.PAYMENT_ON_TIME,
      sourceType: UserEventSourceType.PAYMENT_RECORD,
      sourceId: basePaymentRecord.id,
      metadata: {},
      createdAt: new Date(),
    });
    mockPrismaService.creditProfile.upsert.mockResolvedValue({
      id: 'credit-profile-1',
      userId: currentUserId,
      currentScore: 600,
      previousScore: 600,
      scoreTier: ScoreTier.GOOD,
      onTimePaymentCount: 0,
      latePaymentCount: 0,
      missedPaymentCount: 0,
      currentUtilisationScore: null,
      lastCalculatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    mockPrismaService.creditProfile.update.mockResolvedValue({});
    mockPrismaService.scoreEvent.create.mockResolvedValue({
      id: 'score-event-1',
      userId: currentUserId,
      creditProfileId: 'credit-profile-1',
      occurrenceId: baseOccurrence.id,
      paymentRecordId: basePaymentRecord.id,
      eventType: ScoreEventType.PAYMENT_ON_TIME,
      pointsDelta: 8,
      scoreBefore: 600,
      scoreAfter: 608,
      explanation: 'Paid Mock obligation on time.',
      calculationMetadata: {},
      createdAt: new Date(),
    });
    mockPrismaService.gamificationProfile.upsert.mockResolvedValue({
      id: 'gamification-profile-1',
      userId: currentUserId,
      coinBalance: 0,
      xp: 0,
      mascotLevel: 1,
      mascotMood: MascotMood.NEUTRAL,
      currentPaymentStreak: 0,
      longestPaymentStreak: 0,
      currentKnowledgeStreak: 0,
      longestKnowledgeStreak: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    mockPrismaService.gamificationProfile.update.mockResolvedValue({});
    mockPrismaService.rewardTransaction.create.mockResolvedValue({});
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: BadgeEngineService,
          useValue: mockBadgeEngineService,
        },
        RewardService,
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Test case for ON-TIME payments
  it('successfully logging an ON-TIME payment', async () => {
    const dto = { ...baseDto };
    const mockPaymentRecord = { ...basePaymentRecord };
    const mockUpdateOccurance = {
      ...baseOccurrence, // use the base occurance
      status: PaymentOccurrenceStatus.PAID, // now update that base occurances status to PAID.
      paidAt: new Date(dto.paidDate), // and update that base occurances paidAt to the dto's date.
    };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );
    mockPrismaService.paymentRecord.create.mockResolvedValue(mockPaymentRecord);
    mockPrismaService.paymentOccurrence.update.mockResolvedValue(
      mockUpdateOccurance,
    );

    const result = await service.logPayment(dto, currentUserId);

    expect(mockPrismaService.paymentOccurrence.findFirst).toHaveBeenCalledWith({
      where: {
        id: dto.occurrenceId,
        userId: currentUserId,
      },
      include: {
        obligation: {
          select: {
            name: true,
          },
        },
      },
    });

    expect(mockPrismaService.paymentRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: baseOccurrence.userId,
        occurrenceId: baseOccurrence.id,
        obligationId: baseOccurrence.obligationId,
        currency: Currency.ZAR,
        paymentStatus: PaymentRecordStatus.ON_TIME,
        daysLate: 0,
        notes: dto.notes,
      }) as unknown,
    });

    expect(mockPrismaService.paymentOccurrence.update).toHaveBeenCalledWith({
      where: {
        id: baseOccurrence.id,
      },
      data: {
        status: PaymentOccurrenceStatus.PAID,
        paidAt: new Date(dto.paidDate),
      },
    });

    expect(result.message).toBe('Success. Users payment has been logged');
    expect(result.payment).toEqual(
      expect.objectContaining({
        id: mockPaymentRecord.id,
        amountPaid: 751.83,
        paymentStatus: PaymentRecordStatus.ON_TIME,
      }),
    );
    expect(result.occurrence).toEqual(
      expect.objectContaining({
        id: mockUpdateOccurance.id,
        status: PaymentOccurrenceStatus.PAID,
      }),
    );
    expect(result.scoreImpact).toEqual(
      expect.objectContaining({
        previousScore: 600,
        currentScore: 608,
        delta: 8,
      }),
    );
    expect(result.rewards).toEqual(
      expect.objectContaining({
        coinsAwarded: 15,
        xpAwarded: 10,
        currentPaymentStreak: 1,
      }),
    );
    expect(result.paymentImpact.isLate).toBe(false);
    expect(result.paymentImpact.daysLate).toBe(0);
  });

  // Test case for LATE payments
  it('PaymentsService should successfully log and SIMULATE INTEREST a LATE payment', async () => {
    const dto = {
      ...baseDto, // reference the base dto fields
      paidDate: '2026-05-23', // but use this new date
    };

    const mockPaymentRecord = {
      ...basePaymentRecord, //use the base payment record
      paymentStatus: PaymentRecordStatus.LATE, // but change the status to LATE
      daysLate: 3, // and it was paid 3 days late
      simulatedInterest: new Prisma.Decimal(6),
    };

    const mockUpdatedOccurrence = {
      ...baseOccurrence,
      status: PaymentOccurrenceStatus.PAID_LATE,
      paidAt: new Date(dto.paidDate),
    };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );
    mockPrismaService.paymentRecord.create.mockResolvedValue(mockPaymentRecord);
    mockPrismaService.paymentOccurrence.update.mockResolvedValue(
      mockUpdatedOccurrence,
    );
    mockPrismaService.scoreEvent.create.mockResolvedValue({
      id: 'score-event-1',
      userId: currentUserId,
      creditProfileId: 'credit-profile-1',
      occurrenceId: baseOccurrence.id,
      paymentRecordId: mockPaymentRecord.id,
      eventType: ScoreEventType.PAYMENT_LATE,
      pointsDelta: -8,
      scoreBefore: 600,
      scoreAfter: 592,
      explanation: 'Paid Mock obligation 3 days late.',
      calculationMetadata: {},
      createdAt: new Date(),
    });

    const result = await service.logPayment(dto, currentUserId);

    expect(mockPrismaService.paymentOccurrence.findFirst).toHaveBeenCalledWith({
      where: {
        id: dto.occurrenceId,
        userId: currentUserId,
      },
      include: {
        obligation: {
          select: {
            name: true,
          },
        },
      },
    });
    expect(mockPrismaService.paymentRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        paymentStatus: PaymentRecordStatus.LATE,
        daysLate: 3,
      }) as unknown,
    });

    expect(mockPrismaService.paymentOccurrence.update).toHaveBeenCalledWith({
      where: {
        id: baseOccurrence.id,
      },
      data: {
        status: PaymentOccurrenceStatus.PAID_LATE,
        paidAt: new Date(dto.paidDate),
      },
    });

    expect(result.paymentImpact.isLate).toBe(true);
    expect(result.paymentImpact.daysLate).toBe(3);
    expect(result.paymentImpact.simulatedInterest).toBe(6);
    expect(result.scoreImpact.delta).toBe(-8);
    expect(result.rewards.coinsAwarded).toBe(0);
    expect(result.rewards.currentPaymentStreak).toBe(0);
  });

  //////////////////////////////////////////////////////////////////////////////

  it('should throw NotFoundExpectuon when occurenceId does not exist', async () => {
    const dto = {
      ...baseDto,
      occurrenceId: 'non-existing-occurence-id',
    };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(null);

    await expect(service.logPayment(dto, currentUserId)).rejects.toThrow(
      NotFoundException,
    );

    expect(mockPrismaService.paymentRecord.create).not.toHaveBeenCalled();
    expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();
  });

  //////////////////////////////////////////////////////////////////////////////

  it('should throw NotFoundException when occurrence does not belong to current user', async () => {
    const dto = {
      ...baseDto,
      occurrenceId: 'baseOccurrence-id',
    };

    const differentUserId = 'another-user-id';

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(null);

    await expect(service.logPayment(dto, differentUserId)).rejects.toThrow(
      NotFoundException,
    );

    expect(mockPrismaService.paymentOccurrence.findFirst).toHaveBeenCalledWith({
      where: {
        id: dto.occurrenceId,
        userId: differentUserId,
      },
      include: {
        obligation: {
          select: {
            name: true,
          },
        },
      },
    });

    expect(mockPrismaService.paymentRecord.create).not.toHaveBeenCalled();
    expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();
  });

  //////////////////////////////////////////////////////////////////////////////

  it('should throw BadRequestException when occurrence is already PAID', async () => {
    const dto = { ...baseDto };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue({
      ...baseOccurrence, // use that base occurance
      status: PaymentOccurrenceStatus.PAID, // but it has a PAID status instead.
    });

    await expect(service.logPayment(dto, currentUserId)).rejects.toThrow(
      BadRequestException,
    );

    expect(mockPrismaService.paymentRecord.create).not.toHaveBeenCalled();
    expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();
  });

  //////////////////////////////////////////////////////////////////////////////

  it('should throw BadRequestException when occurrence is already PAID', async () => {
    const dto = { ...baseDto };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue({
      ...baseOccurrence, // use that base occurance
      status: PaymentOccurrenceStatus.PAID_LATE, // but it has a PAID status instead.
    });

    await expect(service.logPayment(dto, currentUserId)).rejects.toThrow(
      BadRequestException,
    );

    expect(mockPrismaService.paymentRecord.create).not.toHaveBeenCalled();
    expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();
  });

  //////////////////////////////////////////////////////////////////////////////

  it('should throw BadRequestException when occurrence is already MISSED', async () => {
    const dto = { ...baseDto };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue({
      ...baseOccurrence, // use that base occurance
      status: PaymentOccurrenceStatus.MISSED, // but it has a PAID status instead.
    });

    await expect(service.logPayment(dto, currentUserId)).rejects.toThrow(
      BadRequestException,
    );

    expect(mockPrismaService.paymentRecord.create).not.toHaveBeenCalled();
    expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();
  });

  //////////////////////////////////////////////////////////////////////////////

  it('should throw BadRequestException when occurrence is already CANCELLED', async () => {
    const dto = { ...baseDto };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue({
      ...baseOccurrence, // use that base occurance
      status: PaymentOccurrenceStatus.CANCELLED, // but it has a PAID status instead.
    });

    await expect(service.logPayment(dto, currentUserId)).rejects.toThrow(
      BadRequestException,
    );

    expect(mockPrismaService.paymentRecord.create).not.toHaveBeenCalled();
    expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();
  });

  //////////////////////////////////////////////////////////////////////////////

  it('should throw BadRequestException when dto.amountPaid does not equal occurrence.amountDue', async () => {
    const dto = {
      ...baseDto,
      amountPaid: 700, // use the base dto but change its amount form 713 to 700.
    };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );

    await expect(service.logPayment(dto, currentUserId)).rejects.toThrow(
      BadRequestException,
    );

    expect(mockPrismaService.paymentRecord.create).not.toHaveBeenCalled();
    expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();
  });

  //////////////////////////////////////////////////////////////////////////////

  it('creates a score increase notification after an on-time payment', async () => {
    const dto = { ...baseDto };
    const mockPaymentRecord = { ...basePaymentRecord };
    const mockUpdatedOccurrence = {
      ...baseOccurrence,
      status: PaymentOccurrenceStatus.PAID,
      paidAt: new Date(dto.paidDate),
    };
    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );
    mockPrismaService.paymentRecord.create.mockResolvedValue(mockPaymentRecord);
    mockPrismaService.paymentOccurrence.update.mockResolvedValue(
      mockUpdatedOccurrence,
    );
    await service.logPayment(dto, currentUserId);
    expect(mockNotificationsService.create).toHaveBeenCalledTimes(1);
    expect(mockNotificationsService.create).toHaveBeenCalledWith(
      {
        userId: currentUserId,
        type: NotificationType.SCORE_CHANGE,
        title: 'Credit score updated',
        message: 'Your simulated credit score increased from 600 to 608.',
        sourceType: UserEventSourceType.PAYMENT_RECORD,
        sourceId: mockPaymentRecord.id,
      },
      mockPrismaService,
    );
  });
  it('creates a score decrease notification after a late payment', async () => {
    const dto = {
      ...baseDto,
      paidDate: '2026-05-23',
    };
    const mockPaymentRecord = {
      ...basePaymentRecord,
      paymentStatus: PaymentRecordStatus.LATE,
      daysLate: 3,
      simulatedInterest: new Prisma.Decimal(6),
    };
    const mockUpdatedOccurrence = {
      ...baseOccurrence,
      status: PaymentOccurrenceStatus.PAID_LATE,
      paidAt: new Date(dto.paidDate),
    };
    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );
    mockPrismaService.paymentRecord.create.mockResolvedValue(mockPaymentRecord);
    mockPrismaService.paymentOccurrence.update.mockResolvedValue(
      mockUpdatedOccurrence,
    );
    await service.logPayment(dto, currentUserId);
    expect(mockNotificationsService.create).toHaveBeenCalledTimes(1);
    expect(mockNotificationsService.create).toHaveBeenCalledWith(
      {
        userId: currentUserId,
        type: NotificationType.SCORE_CHANGE,
        title: 'Credit score updated',
        message: 'Your simulated credit score decreased from 600 to 592.',
        sourceType: UserEventSourceType.PAYMENT_RECORD,
        sourceId: mockPaymentRecord.id,
      },
      mockPrismaService,
    );
  });
  it('does not create a notification when the score does not change', async () => {
    const dto = { ...baseDto };
    const mockPaymentRecord = { ...basePaymentRecord };
    const mockUpdatedOccurrence = {
      ...baseOccurrence,
      status: PaymentOccurrenceStatus.PAID,
      paidAt: new Date(dto.paidDate),
    };
    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );
    mockPrismaService.paymentRecord.create.mockResolvedValue(mockPaymentRecord);
    mockPrismaService.paymentOccurrence.update.mockResolvedValue(
      mockUpdatedOccurrence,
    );
    mockPrismaService.creditProfile.upsert.mockResolvedValue({
      id: 'credit-profile-1',
      userId: currentUserId,
      currentScore: 850,
      previousScore: 842,
      scoreTier: ScoreTier.ELITE,
      onTimePaymentCount: 1,
      latePaymentCount: 0,
      missedPaymentCount: 0,
      currentUtilisationScore: null,
      lastCalculatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });
    await service.logPayment(dto, currentUserId);
    expect(mockNotificationsService.create).not.toHaveBeenCalled();
  });
  it('does not create a notification when the score update fails', async () => {
    const dto = { ...baseDto };
    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );
    mockPrismaService.paymentRecord.create.mockResolvedValue(basePaymentRecord);
    mockPrismaService.paymentOccurrence.update.mockResolvedValue({
      ...baseOccurrence,
      status: PaymentOccurrenceStatus.PAID,
      paidAt: new Date(dto.paidDate),
    });
    mockPrismaService.creditProfile.update.mockRejectedValue(
      new Error('Score update failed'),
    );
    await expect(service.logPayment(dto, currentUserId)).rejects.toThrow(
      'Score update failed',
    );
    expect(mockNotificationsService.create).not.toHaveBeenCalled();
  });
  it('does not create another notification when a paid payment is retried', async () => {
    const dto = { ...baseDto };
    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue({
      ...baseOccurrence,
      status: PaymentOccurrenceStatus.PAID,
    });
    await expect(service.logPayment(dto, currentUserId)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockNotificationsService.create).not.toHaveBeenCalled();
  });
  it('evaluates payment badges using the updated payment values', async () => {
    const dto = { ...baseDto };
    const mockPaymentRecord = { ...basePaymentRecord };
    const mockUpdatedOccurrence = {
      ...baseOccurrence,
      status: PaymentOccurrenceStatus.PAID,
      paidAt: new Date(dto.paidDate),
    };
    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );
    mockPrismaService.paymentRecord.create.mockResolvedValue(mockPaymentRecord);
    mockPrismaService.paymentOccurrence.update.mockResolvedValue(
      mockUpdatedOccurrence,
    );
    await service.logPayment(dto, currentUserId);
    expect(mockBadgeEngineService.evaluatePaymentBadges).toHaveBeenCalledTimes(
      1,
    );
    expect(mockBadgeEngineService.evaluatePaymentBadges).toHaveBeenCalledWith(
      {
        userId: currentUserId,
        sourceEventId: 'payment-event-1',
        onTimePaymentCount: 1,
        currentPaymentStreak: 1,
        currentScore: 608,
      },
      mockPrismaService,
    );
  });
  it('returns earned payment badges in the payment response', async () => {
    const dto = { ...baseDto };
    const mockPaymentRecord = { ...basePaymentRecord };
    const mockUpdatedOccurrence = {
      ...baseOccurrence,
      status: PaymentOccurrenceStatus.PAID,
      paidAt: new Date(dto.paidDate),
    };
    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );
    mockPrismaService.paymentRecord.create.mockResolvedValue(mockPaymentRecord);
    mockPrismaService.paymentOccurrence.update.mockResolvedValue(
      mockUpdatedOccurrence,
    );
    mockBadgeEngineService.evaluatePaymentBadges.mockResolvedValue([
      'On-Time Starter',
    ]);
    const result = await service.logPayment(dto, currentUserId);
    expect(result.rewards.badgesEarned).toEqual(['On-Time Starter']);
  });
  it('does not evaluate payment badges when the payment is retried', async () => {
    const dto = { ...baseDto };
    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue({
      ...baseOccurrence,
      status: PaymentOccurrenceStatus.PAID,
    });
    await expect(service.logPayment(dto, currentUserId)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockBadgeEngineService.evaluatePaymentBadges).not.toHaveBeenCalled();
  });
  it('does not evaluate payment badges when payment processing fails', async () => {
    const dto = { ...baseDto };
    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );
    mockPrismaService.paymentRecord.create.mockResolvedValue(basePaymentRecord);
    mockPrismaService.paymentOccurrence.update.mockResolvedValue({
      ...baseOccurrence,
      status: PaymentOccurrenceStatus.PAID,
      paidAt: new Date(dto.paidDate),
    });
    mockPrismaService.creditProfile.update.mockRejectedValue(
      new Error('Score update failed'),
    );
    await expect(service.logPayment(dto, currentUserId)).rejects.toThrow(
      'Score update failed',
    );
    expect(mockBadgeEngineService.evaluatePaymentBadges).not.toHaveBeenCalled();
  });
});
