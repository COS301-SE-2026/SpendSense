import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CreateContributionInput,
  PaymentContributionsService,
} from './payment-contributions.service';
import {
  PaymentContributionSource,
  PaymentContributionState,
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
import { CreditScoreService } from '../credit-score/credit-score.service'; // we need to mock the credit score service bc of the changes in payments.service.ts

// below is a mock credit score service with the new return structure
type MockScoreImpact = {
  scoreEventId: string;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  tierBefore: ScoreTier;
  tierAfter: ScoreTier;
  explanation: string;
  onTimePaymentCount: number;
  latePaymentCount: number;
};

const mockCreditScoreService: {
  recalculateAfterPayment: jest.Mock<
    Promise<MockScoreImpact>,
    [unknown, unknown]
  >;
} = {
  recalculateAfterPayment: jest.fn<
    Promise<MockScoreImpact>,
    [unknown, unknown]
  >(),
};

const mockRewardService = {
  settleAction: jest.fn(),
};

const onTimeScoreImpact: MockScoreImpact = {
  scoreEventId: 'score-event-1',
  scoreBefore: 600,
  scoreAfter: 608,
  scoreDelta: 8,
  tierBefore: ScoreTier.GOOD,
  tierAfter: ScoreTier.GOOD,
  explanation: 'Paid Mock obligation on time.',
  onTimePaymentCount: 1,
  latePaymentCount: 0,
};

const lateScoreImpact: MockScoreImpact = {
  scoreEventId: 'score-event-1',
  scoreBefore: 600,
  scoreAfter: 592,
  scoreDelta: -8,
  tierBefore: ScoreTier.GOOD,
  tierAfter: ScoreTier.FAIR,
  explanation: 'Paid Mock obligation 3 days late.',
  onTimePaymentCount: 0,
  latePaymentCount: 1,
};

type PrismaMockMethod = jest.Mock<Promise<unknown>, [unknown]>;
type TransactionCallback = (
  tx: PaymentContributionsPrismaMock,
) => Promise<unknown>;

type PaymentContributionsPrismaMock = {
  $queryRaw: jest.Mock;

  paymentOccurrence: {
    findFirst: PrismaMockMethod;
    update: PrismaMockMethod;
  };

  paymentContribution: {
    findUnique: PrismaMockMethod;
    create: PrismaMockMethod;
  };

  userEvent: {
    create: PrismaMockMethod;
    findUnique: PrismaMockMethod;
    update: PrismaMockMethod;
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
  reminder: {
    updateMany: PrismaMockMethod;
  };
  $transaction: jest.Mock<Promise<unknown>, [TransactionCallback]>;
};

describe('PaymentContributionsService', () => {
  let service: PaymentContributionsService;
  let mockPrismaService: PaymentContributionsPrismaMock;

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
    amountPaid: new Prisma.Decimal(0),

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

  const baseInput: CreateContributionInput = {
    userId: currentUserId,
    occurrenceId: baseOccurrence.id,

    amount: new Prisma.Decimal(751.83),

    currency: Currency.ZAR,

    paidDate: new Date('2026-05-19T00:00:00.000Z'),

    source: PaymentContributionSource.MANUAL,

    idempotencyKey: 'payment-test-key-1',

    notes: 'mocked contribution notes',
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

  const baseContribution = {
    id: 'payment-contribution-1',

    userId: currentUserId,

    occurrenceId: baseOccurrence.id,
    obligationId: baseOccurrence.obligationId,

    amount: new Prisma.Decimal(751.83),

    currency: Currency.ZAR,

    paidDate: baseInput.paidDate,

    source: PaymentContributionSource.MANUAL,
    state: PaymentContributionState.POSTED,

    receiptScanId: null,

    notes: baseInput.notes ?? null,

    idempotencyKey: baseInput.idempotencyKey,
    requestPayloadHash: 'mock-request-hash',

    createdAt: new Date(),
    updatedAt: new Date(),

    voidedAt: null,
    voidReason: null,
    voidedByUserId: null,
  };

  const expectedCreateData = {
    userId: baseInput.userId,
    occurrenceId: baseInput.occurrenceId,
    obligationId: baseOccurrence.obligationId,
    amount: baseInput.amount,
    currency: baseInput.currency,
    paidDate: baseInput.paidDate,
    source: baseInput.source,
    idempotencyKey: baseInput.idempotencyKey,
    notes: baseInput.notes,
  };

  beforeEach(async () => {
    mockPrismaService = {
      $queryRaw: jest.fn(),

      paymentOccurrence: {
        findFirst: jest.fn<Promise<unknown>, [unknown]>(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
      },

      paymentContribution: {
        findUnique: jest.fn<Promise<unknown>, [unknown]>(),
        create: jest.fn<Promise<unknown>, [unknown]>(),
      },

      userEvent: {
        create: jest.fn<Promise<unknown>, [unknown]>(),

        findUnique: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({
          metadata: {},
        }),

        update: jest.fn<Promise<unknown>, [unknown]>().mockResolvedValue({}),
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

      reminder: {
        updateMany: jest.fn<Promise<unknown>, [unknown]>(),
      },

      $transaction: jest.fn<Promise<unknown>, [TransactionCallback]>(),
    };

    jest.clearAllMocks();

    mockRewardService.settleAction.mockResolvedValue({
      coinBalance: 15,
      xp: 10,
      streak: {
        current: 1,
        longest: 1,
      },
    });

    mockPrismaService.$queryRaw.mockResolvedValue([
      {
        id: baseOccurrence.id,
      },
    ]);

    mockPrismaService.reminder.updateMany.mockResolvedValue({
      count: 1,
    });

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );

    mockPrismaService.paymentContribution.findUnique.mockResolvedValue(null);

    mockPrismaService.paymentContribution.create.mockResolvedValue(
      baseContribution,
    );

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

    mockCreditScoreService.recalculateAfterPayment.mockResolvedValue(
      onTimeScoreImpact,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentContributionsService,
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
        {
          provide: CreditScoreService,
          useValue: mockCreditScoreService,
        },
        {
          provide: RewardService,
          useValue: mockRewardService,
        },
      ],
    }).compile();

    service = module.get<PaymentContributionsService>(
      PaymentContributionsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Test case for ON-TIME payments
  it('[PRESERVED] successfully logging an ON-TIME payment', async () => {
    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );

    const mockUpdateOccurance = {
      ...baseOccurrence,
      amountPaid: new Prisma.Decimal(751.83),
      status: PaymentOccurrenceStatus.PAID,
      paidAt: baseInput.paidDate,
    };

    mockPrismaService.paymentOccurrence.update.mockResolvedValue(
      mockUpdateOccurance,
    );

    const result = await service.createContribution(baseInput);

    expect(mockPrismaService.paymentOccurrence.findFirst).toHaveBeenCalledWith({
      where: {
        id: baseInput.occurrenceId,
        userId: currentUserId,
        deletedAt: null,
      },

      include: {
        obligation: {
          select: {
            name: true,
          },
        },
      },
    });

    const anyString: unknown = expect.any(String);

    expect(mockPrismaService.paymentContribution.create).toHaveBeenCalledWith({
      data: {
        ...expectedCreateData,
        receiptScanId: null,
        requestPayloadHash: anyString,
      },
    });

    expect(mockPrismaService.paymentOccurrence.update).toHaveBeenCalledWith({
      where: {
        id: baseOccurrence.id,
      },

      data: {
        amountPaid: new Prisma.Decimal(751.83),
        status: PaymentOccurrenceStatus.PAID,
        paidAt: new Date(baseInput.paidDate),
      },
    });

    expect(result.contribution).toEqual(
      expect.objectContaining({
        id: baseContribution.id,
        amount: '751.83',
        currency: Currency.ZAR,
        source: PaymentContributionSource.MANUAL,
      }),
    );

    expect(result.occurrence).toEqual(
      expect.objectContaining({
        id: mockUpdateOccurance.id,
        amountPaid: '751.83',
        amountRemaining: '0.00',
        status: PaymentOccurrenceStatus.PAID,
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
  it('[PRESERVED] PaymentsService should successfully log and SIMULATE INTEREST a LATE payment', async () => {
    const lateInput: CreateContributionInput = {
      ...baseInput,
      paidDate: new Date('2026-05-23T00:00:00.000Z'),
      idempotencyKey: 'late-payment-test-key',
    };

    const mockContribution = {
      ...baseContribution,
      id: 'late-payment-contribution-1',
      paidDate: lateInput.paidDate,
      idempotencyKey: lateInput.idempotencyKey,
    };

    const mockUpdatedOccurrence = {
      ...baseOccurrence,
      status: PaymentOccurrenceStatus.PAID_LATE,
      paidAt: new Date(lateInput.paidDate),
    };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );
    mockPrismaService.paymentContribution.create.mockResolvedValue(
      mockContribution,
    );

    mockPrismaService.paymentOccurrence.update.mockResolvedValue(
      mockUpdatedOccurrence,
    );

    mockPrismaService.scoreEvent.create.mockResolvedValue({
      id: 'score-event-1',
      userId: currentUserId,
      creditProfileId: 'credit-profile-1',
      occurrenceId: baseOccurrence.id,
      eventType: ScoreEventType.PAYMENT_LATE,
      pointsDelta: -8,
      scoreBefore: 600,
      scoreAfter: 592,
      explanation: 'Paid Mock obligation 3 days late.',
      calculationMetadata: {},
      createdAt: new Date(),
    });

    mockCreditScoreService.recalculateAfterPayment.mockResolvedValueOnce(
      lateScoreImpact,
    );

    mockRewardService.settleAction.mockResolvedValueOnce({
      coinBalance: 0,
      xp: 0,
      streak: {
        current: 0,
        longest: 1,
      },
    });

    const result = await service.createContribution(lateInput);

    expect(mockPrismaService.paymentOccurrence.findFirst).toHaveBeenCalledWith({
      where: {
        id: lateInput.occurrenceId,
        userId: currentUserId,
        deletedAt: null,
      },
      include: {
        obligation: {
          select: {
            name: true,
          },
        },
      },
    });

    const expectedCreateData = {
      userId: currentUserId,
      occurrenceId: baseOccurrence.id,
      obligationId: baseOccurrence.obligationId,

      amount: lateInput.amount,
      currency: lateInput.currency,
      paidDate: lateInput.paidDate,

      source: lateInput.source,
      idempotencyKey: lateInput.idempotencyKey,
      notes: lateInput.notes,
    };

    const anyString: unknown = expect.any(String);

    expect(mockPrismaService.paymentContribution.create).toHaveBeenCalledWith({
      data: {
        ...expectedCreateData,
        receiptScanId: null,
        requestPayloadHash: anyString,
      },
    });

    expect(mockPrismaService.paymentOccurrence.update).toHaveBeenCalledWith({
      where: {
        id: baseOccurrence.id,
      },
      data: {
        amountPaid: new Prisma.Decimal(751.83),
        status: PaymentOccurrenceStatus.PAID_LATE,
        paidAt: lateInput.paidDate,
      },
    });

    expect(mockCreditScoreService.recalculateAfterPayment).toHaveBeenCalledWith(
      mockPrismaService,
      expect.objectContaining({
        userId: currentUserId,
        occurrenceId: baseOccurrence.id,
        paymentContributionId: mockContribution.id,
        eventType: ScoreEventType.PAYMENT_LATE,
        explanation: 'Paid Mock obligation 3 days late.',
      }),
    );

    expect(result.paymentImpact.isLate).toBe(true);
    expect(result.paymentImpact.daysLate).toBe(3);
    expect(result.paymentImpact.simulatedInterest).toBe(6);
    expect(result.scoreImpact.delta).toBe(-8);
    expect(result.rewards.coinsAwarded).toBe(0);
    expect(result.rewards.currentPaymentStreak).toBe(0);
  });

  //////////////////////////////////////////////////////////////////////////////

  it(' [PRESERVED] should throw NotFoundExpectuon when occurrenceId does not exist', async () => {
    const input: CreateContributionInput = {
      ...baseInput,
      occurrenceId: 'non-existing-occurrence-id',
    };
    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(null);

    await expect(service.createContribution(input)).rejects.toThrow(
      NotFoundException,
    );

    expect(mockPrismaService.paymentContribution.create).not.toHaveBeenCalled();
    expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();
  });

  //////////////////////////////////////////////////////////////////////////////

  it('[PRESERVED] should throw NotFoundException when occurrence does not belong to current user', async () => {
    const differentUserId = 'another-user-id';
    const input: CreateContributionInput = {
      ...baseInput,
      userId: differentUserId,
    };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(null);

    await expect(service.createContribution(input)).rejects.toThrow(
      NotFoundException,
    );

    expect(mockPrismaService.paymentOccurrence.findFirst).toHaveBeenCalledWith({
      where: {
        id: input.occurrenceId,
        userId: differentUserId,
        deletedAt: null,
      },
      include: {
        obligation: {
          select: {
            name: true,
          },
        },
      },
    });

    expect(mockPrismaService.paymentContribution.create).not.toHaveBeenCalled();
    expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();
  });

  it.each([
    PaymentOccurrenceStatus.PAID,
    PaymentOccurrenceStatus.PAID_LATE,
    PaymentOccurrenceStatus.MISSED,
    PaymentOccurrenceStatus.CANCELLED,
  ])(
    '[PRESERVED] should throw BadRequestException when occurrence status is %s',
    async (status) => {
      mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue({
        ...baseOccurrence,
        status,
      });

      await expect(service.createContribution(baseInput)).rejects.toThrow(
        BadRequestException,
      );

      expect(
        mockPrismaService.paymentContribution.create,
      ).not.toHaveBeenCalled();

      expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();

      expect(
        mockCreditScoreService.recalculateAfterPayment,
      ).not.toHaveBeenCalled();

      expect(
        mockBadgeEngineService.evaluatePaymentBadges,
      ).not.toHaveBeenCalled();
    },
  );

  //////////////////////////////////////////////////////////////////////////////

  /*********************************************************************************/
  /*                               NOTIFICATIONS                                   */
  /*********************************************************************************/
  it('creates a score increase notification after an on-time payment', async () => {
    const mockUpdatedOccurrence = {
      ...baseOccurrence,
      status: PaymentOccurrenceStatus.PAID,
      paidAt: new Date(baseInput.paidDate),
    };
    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );

    mockPrismaService.paymentContribution.create.mockResolvedValue(
      baseContribution,
    );

    mockPrismaService.paymentOccurrence.update.mockResolvedValue(
      mockUpdatedOccurrence,
    );

    mockCreditScoreService.recalculateAfterPayment.mockResolvedValue(
      onTimeScoreImpact,
    );

    await service.createContribution(baseInput);

    expect(mockNotificationsService.create).toHaveBeenCalledTimes(1);
    expect(mockNotificationsService.create).toHaveBeenCalledWith(
      {
        userId: currentUserId,
        type: NotificationType.SCORE_CHANGE,
        title: 'Credit score updated',
        message: 'Your simulated credit score increased from 600 to 608.',
        sourceType: UserEventSourceType.PAYMENT_RECORD,
        sourceId: baseContribution.id,
      },
      mockPrismaService,
    );
  });

  it('[PRESERVED] creates a score decrease notification after a late full payment', async () => {
    const lateInput: CreateContributionInput = {
      ...baseInput,
      paidDate: new Date('2026-05-23T00:00:00.000Z'),
      idempotencyKey: 'late-payment-notification-key',
    };

    const mockContribution = {
      ...baseContribution,
      id: 'late-payment-contribution-1',
      paidDate: lateInput.paidDate,
      idempotencyKey: lateInput.idempotencyKey,
    };

    const mockUpdatedOccurrence = {
      ...baseOccurrence,
      amountPaid: new Prisma.Decimal(751.83),
      status: PaymentOccurrenceStatus.PAID_LATE,
      paidAt: lateInput.paidDate,
    };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );

    mockPrismaService.paymentContribution.create.mockResolvedValue(
      mockContribution,
    );

    mockPrismaService.paymentOccurrence.update.mockResolvedValue(
      mockUpdatedOccurrence,
    );

    mockCreditScoreService.recalculateAfterPayment.mockResolvedValue(
      lateScoreImpact,
    );

    await service.createContribution(lateInput);

    expect(mockNotificationsService.create).toHaveBeenCalledTimes(1);

    expect(mockNotificationsService.create).toHaveBeenCalledWith(
      {
        userId: currentUserId,
        type: NotificationType.SCORE_CHANGE,
        title: 'Credit score updated',
        message: 'Your simulated credit score decreased from 600 to 592.',

        sourceType: UserEventSourceType.PAYMENT_RECORD,

        sourceId: mockContribution.id,
      },
      mockPrismaService,
    );
  });

  it('[PRESERVED] does not create a notification when the score does not change', async () => {
    const mockUpdatedOccurrence = {
      ...baseOccurrence,
      amountPaid: new Prisma.Decimal(751.83),
      status: PaymentOccurrenceStatus.PAID,
      paidAt: baseInput.paidDate,
    };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );

    mockPrismaService.paymentContribution.create.mockResolvedValue(
      baseContribution,
    );

    mockPrismaService.paymentOccurrence.update.mockResolvedValue(
      mockUpdatedOccurrence,
    );

    mockCreditScoreService.recalculateAfterPayment.mockResolvedValueOnce({
      scoreEventId: 'score-event-1',
      scoreBefore: 850,
      scoreAfter: 850,
      scoreDelta: 0,
      tierBefore: ScoreTier.ELITE,
      tierAfter: ScoreTier.ELITE,
      explanation: 'Paid Mock obligation on time.',
      onTimePaymentCount: 2,
      latePaymentCount: 0,
    });

    await service.createContribution(baseInput);

    expect(mockNotificationsService.create).not.toHaveBeenCalled();
  });

  it('[PRESERVED] does not create a notification when the score update fails', async () => {
    const mockUpdatedOccurrence = {
      ...baseOccurrence,
      amountPaid: new Prisma.Decimal(751.83),
      status: PaymentOccurrenceStatus.PAID,
      paidAt: baseInput.paidDate,
    };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );

    mockPrismaService.paymentContribution.create.mockResolvedValue(
      baseContribution,
    );

    mockPrismaService.paymentOccurrence.update.mockResolvedValue(
      mockUpdatedOccurrence,
    );

    mockCreditScoreService.recalculateAfterPayment.mockRejectedValueOnce(
      new Error('Score update failed'),
    );

    await expect(service.createContribution(baseInput)).rejects.toThrow(
      'Score update failed',
    );

    expect(mockNotificationsService.create).not.toHaveBeenCalled();

    expect(mockBadgeEngineService.evaluatePaymentBadges).not.toHaveBeenCalled();
  });

  it('[PRESERVED] does not create a notification when a new payment is attempted on an already paid occurrence', async () => {
    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue({
      ...baseOccurrence,
      amountPaid: new Prisma.Decimal(751.83),
      status: PaymentOccurrenceStatus.PAID,
      paidAt: baseInput.paidDate,
    });

    // lack of matching contribution means this is NOT an idempotent replay.
    mockPrismaService.paymentContribution.findUnique.mockResolvedValue(null);

    await expect(service.createContribution(baseInput)).rejects.toThrow(
      BadRequestException,
    );

    expect(mockNotificationsService.create).not.toHaveBeenCalled();

    expect(
      mockCreditScoreService.recalculateAfterPayment,
    ).not.toHaveBeenCalled();

    expect(mockBadgeEngineService.evaluatePaymentBadges).not.toHaveBeenCalled();
  });

  /*********************************************************************************/
  /*                                    BADGES                                     */
  /*********************************************************************************/
  it('evaluates payment badges using the updated payment values', async () => {
    const mockUpdatedOccurrence = {
      ...baseOccurrence,
      status: PaymentOccurrenceStatus.PAID,
      paidAt: baseInput.paidDate,
    };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );

    mockPrismaService.paymentContribution.create.mockResolvedValue(
      baseContribution,
    );

    mockPrismaService.paymentOccurrence.update.mockResolvedValue(
      mockUpdatedOccurrence,
    );

    mockCreditScoreService.recalculateAfterPayment.mockResolvedValue(
      onTimeScoreImpact,
    );

    await service.createContribution(baseInput);

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

  it('[PRESERVED] returns earned payment badges in the payment response', async () => {
    const mockUpdatedOccurrence = {
      ...baseOccurrence,
      amountPaid: new Prisma.Decimal(751.83),
      status: PaymentOccurrenceStatus.PAID,
      paidAt: baseInput.paidDate,
    };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );

    mockPrismaService.paymentContribution.create.mockResolvedValue(
      baseContribution,
    );

    mockPrismaService.paymentOccurrence.update.mockResolvedValue(
      mockUpdatedOccurrence,
    );

    mockBadgeEngineService.evaluatePaymentBadges.mockResolvedValue([
      'On-Time Starter',
    ]);

    const result = await service.createContribution(baseInput);

    // This contribution fully settles the occurrence,
    // so settlement rewards should exist.
    expect(result.rewards).not.toBeNull();

    if (!result.rewards) {
      throw new Error(
        'Expected rewards for a fully settled payment occurrence',
      );
    }

    expect(result.rewards.badgesEarned).toEqual(['On-Time Starter']);
  });

  it('[PRESERVED] does not evaluate payment badges when a new contribution is attempted on an already paid occurrence', async () => {
    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue({
      ...baseOccurrence,
      amountPaid: new Prisma.Decimal(751.83),
      status: PaymentOccurrenceStatus.PAID,
      paidAt: baseInput.paidDate,
    });

    // No matching contribution means this is NOT an idempotent replay.
    mockPrismaService.paymentContribution.findUnique.mockResolvedValue(null);

    await expect(service.createContribution(baseInput)).rejects.toThrow(
      BadRequestException,
    );

    expect(mockBadgeEngineService.evaluatePaymentBadges).not.toHaveBeenCalled();

    expect(mockRewardService.settleAction).not.toHaveBeenCalled();

    expect(
      mockCreditScoreService.recalculateAfterPayment,
    ).not.toHaveBeenCalled();
  });

  it('[PRESERVED] does not evaluate payment badges when payment processing fails', async () => {
    const mockUpdatedOccurrence = {
      ...baseOccurrence,
      amountPaid: new Prisma.Decimal(751.83),
      status: PaymentOccurrenceStatus.PAID,
      paidAt: baseInput.paidDate,
    };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
      baseOccurrence,
    );

    mockPrismaService.paymentContribution.create.mockResolvedValue(
      baseContribution,
    );

    mockPrismaService.paymentOccurrence.update.mockResolvedValue(
      mockUpdatedOccurrence,
    );

    mockCreditScoreService.recalculateAfterPayment.mockRejectedValueOnce(
      new Error('Score update failed'),
    );

    await expect(service.createContribution(baseInput)).rejects.toThrow(
      'Score update failed',
    );

    expect(mockBadgeEngineService.evaluatePaymentBadges).not.toHaveBeenCalled();

    expect(mockRewardService.settleAction).not.toHaveBeenCalled();

    expect(mockNotificationsService.create).not.toHaveBeenCalled();
  });

  describe('partial payment behaviour', () => {
    it('creates a partial contribution and marks the occurrence as PARTIALLY_PAID', async () => {
      const partialInput: CreateContributionInput = {
        ...baseInput,
        amount: new Prisma.Decimal(100),
        idempotencyKey: 'partial-payment-key-1',
      };

      const partialContribution = {
        ...baseContribution,
        id: 'partial-contribution-1',
        amount: new Prisma.Decimal(100),
        idempotencyKey: partialInput.idempotencyKey,
      };

      const mockUpdatedOccurrence = {
        ...baseOccurrence,
        amountPaid: new Prisma.Decimal(100),
        status: PaymentOccurrenceStatus.PARTIALLY_PAID,
        paidAt: null,
      };

      mockPrismaService.paymentContribution.create.mockResolvedValue(
        partialContribution,
      );

      mockPrismaService.paymentOccurrence.update.mockResolvedValue(
        mockUpdatedOccurrence,
      );

      const expectedCreateData = {
        userId: currentUserId,
        occurrenceId: baseOccurrence.id,
        obligationId: baseOccurrence.obligationId,
        amount: partialInput.amount,
        currency: partialInput.currency,
        paidDate: partialInput.paidDate,
        source: partialInput.source,
        idempotencyKey: partialInput.idempotencyKey,
        notes: partialInput.notes,
      };

      const result = await service.createContribution(partialInput);

      const anyString: unknown = expect.any(String);

      expect(mockPrismaService.paymentContribution.create).toHaveBeenCalledWith(
        {
          data: {
            ...expectedCreateData,
            receiptScanId: null,
            requestPayloadHash: anyString,
          },
        },
      );

      expect(mockPrismaService.paymentOccurrence.update).toHaveBeenCalledWith({
        where: {
          id: baseOccurrence.id,
        },
        data: {
          amountPaid: new Prisma.Decimal(100),
          status: PaymentOccurrenceStatus.PARTIALLY_PAID,
          paidAt: null,
        },
      });

      expect(result.occurrence).toEqual(
        expect.objectContaining({
          amountPaid: '100.00',
          amountRemaining: '651.83',
          status: PaymentOccurrenceStatus.PARTIALLY_PAID,
          paidAt: null,
        }),
      );

      expect(result.settlement).toBeNull();
      expect(result.scoreImpact).toBeNull();
      expect(result.rewards).toBeNull();
    });

    it('does not run settlement side effects for a partial payment', async () => {
      const partialInput: CreateContributionInput = {
        ...baseInput,
        amount: new Prisma.Decimal(100),
        idempotencyKey: 'partial-payment-key-2',
      };

      mockPrismaService.paymentContribution.create.mockResolvedValue({
        ...baseContribution,
        amount: new Prisma.Decimal(100),
        idempotencyKey: partialInput.idempotencyKey,
      });

      mockPrismaService.paymentOccurrence.update.mockResolvedValue({
        ...baseOccurrence,
        amountPaid: new Prisma.Decimal(100),
        status: PaymentOccurrenceStatus.PARTIALLY_PAID,
        paidAt: null,
      });

      await service.createContribution(partialInput);

      expect(
        mockCreditScoreService.recalculateAfterPayment,
      ).not.toHaveBeenCalled();

      expect(mockRewardService.settleAction).not.toHaveBeenCalled();

      expect(
        mockBadgeEngineService.evaluatePaymentBadges,
      ).not.toHaveBeenCalled();

      expect(mockNotificationsService.create).not.toHaveBeenCalled();

      expect(mockPrismaService.reminder.updateMany).not.toHaveBeenCalled();
    });

    it('settles an occurrence when a later CONTRUBTUION pays the REMAINING BALANCE', async () => {
      const partiallyPaidOccurrence = {
        ...baseOccurrence,
        amountPaid: new Prisma.Decimal(100),
        status: PaymentOccurrenceStatus.PARTIALLY_PAID,
      };

      const finalInput: CreateContributionInput = {
        ...baseInput,
        amount: new Prisma.Decimal(651.83),
        idempotencyKey: 'final-payment-key-1',
      };

      const finalContribution = {
        ...baseContribution,
        id: 'final-contribution-1',
        amount: new Prisma.Decimal(651.83),
        idempotencyKey: finalInput.idempotencyKey,
      };

      const settledOccurrence = {
        ...partiallyPaidOccurrence,
        amountPaid: new Prisma.Decimal(751.83),
        status: PaymentOccurrenceStatus.PAID,
        paidAt: finalInput.paidDate,
      };

      mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
        partiallyPaidOccurrence,
      );

      mockPrismaService.paymentContribution.create.mockResolvedValue(
        finalContribution,
      );

      mockPrismaService.paymentOccurrence.update.mockResolvedValue(
        settledOccurrence,
      );

      const result = await service.createContribution(finalInput);

      expect(mockPrismaService.paymentOccurrence.update).toHaveBeenCalledWith({
        where: {
          id: baseOccurrence.id,
        },
        data: {
          amountPaid: new Prisma.Decimal(751.83),
          status: PaymentOccurrenceStatus.PAID,
          paidAt: finalInput.paidDate,
        },
      });

      expect(result.occurrence).toEqual(
        expect.objectContaining({
          amountPaid: '751.83',
          amountRemaining: '0.00',
          status: PaymentOccurrenceStatus.PAID,
        }),
      );

      expect(result.settlement).toEqual({
        isLate: false,
        daysLate: 0,
      });

      expect(
        mockCreditScoreService.recalculateAfterPayment,
      ).toHaveBeenCalledTimes(1);

      expect(mockRewardService.settleAction).toHaveBeenCalledTimes(1);

      expect(
        mockBadgeEngineService.evaluatePaymentBadges,
      ).toHaveBeenCalledTimes(1);

      expect(mockPrismaService.reminder.updateMany).toHaveBeenCalledTimes(1);
    });

    it('rejects a contribution that exceeds the remaining balance', async () => {
      const partiallyPaidOccurrence = {
        ...baseOccurrence,
        amountPaid: new Prisma.Decimal(700),
        status: PaymentOccurrenceStatus.PARTIALLY_PAID,
      };

      const input: CreateContributionInput = {
        ...baseInput,
        amount: new Prisma.Decimal(100),
        idempotencyKey: 'overpayment-key-1',
      };

      mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
        partiallyPaidOccurrence,
      );

      await expect(service.createContribution(input)).rejects.toThrow(
        BadRequestException,
      );

      expect(
        mockPrismaService.paymentContribution.create,
      ).not.toHaveBeenCalled();

      expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();

      expect(
        mockCreditScoreService.recalculateAfterPayment,
      ).not.toHaveBeenCalled();
    });
  });

  describe('idempotency', () => {
    it('replays the same contribution WITHOUT creating another payment / rerunning settlement effects', async () => {
      const settledOccurrence = {
        ...baseOccurrence,
        amountPaid: new Prisma.Decimal(751.83),
        status: PaymentOccurrenceStatus.PAID,
        paidAt: baseInput.paidDate,
      };

      mockPrismaService.paymentOccurrence.update.mockResolvedValue(
        settledOccurrence,
      );

      // FIRST REQUEST
      await service.createContribution(baseInput);

      // Grab the real payload hash generated by the service.
      const createCall = mockPrismaService.paymentContribution.create.mock
        .calls[0][0] as {
        data: {
          requestPayloadHash: string;
        };
      };

      const payloadHash = createCall.data.requestPayloadHash;

      const existingContribution = {
        ...baseContribution,
        requestPayloadHash: payloadHash,

        occurrence: {
          ...settledOccurrence,
          obligation: {
            name: 'Mock obligation',
          },
        },
      };

      // SECOND REQUEST: same key + same payload.
      mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(
        settledOccurrence,
      );

      mockPrismaService.paymentContribution.findUnique.mockResolvedValue(
        existingContribution,
      );

      const replay = await service.createContribution(baseInput);

      expect(replay.replayed).toBe(true);

      expect(
        mockPrismaService.paymentContribution.create,
      ).toHaveBeenCalledTimes(1);

      expect(
        mockCreditScoreService.recalculateAfterPayment,
      ).toHaveBeenCalledTimes(1);

      expect(mockRewardService.settleAction).toHaveBeenCalledTimes(1);

      expect(
        mockBadgeEngineService.evaluatePaymentBadges,
      ).toHaveBeenCalledTimes(1);

      expect(mockNotificationsService.create).toHaveBeenCalledTimes(1);
    });
  });
});
