import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  Currency,
  MascotMood,
  PaymentOccurrenceStatus,
  PaymentRecordStatus,
  Prisma,
  RewardTransactionType,
  ScoreEventType,
  ScoreTier,
  UserEventSourceType,
  UserEventType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// to run the tests in this file by itself: npm test -- payments.service.spec.ts
describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPrismaService = {

    paymentOccurrence: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },

    paymentRecord: {
      create: jest.fn(), // we're going to be creating a PaymentRecord
    },

    userEvent: {
      create: jest.fn(),
    },

    creditProfile: {
      upsert: jest.fn(),
      update: jest.fn(),
    },

    scoreEvent: {
      create: jest.fn(),
    },

    gamificationProfile: {
      upsert: jest.fn(),
      update: jest.fn(),
    },

    rewardTransaction: {
      create: jest.fn(),
    },

    $transaction: jest.fn((callback) => callback(mockPrismaService)),
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
  const baseDto = {
    occurrenceId: 'baseOccurrence-id',
    paidDate: '2026-05-19',
    amountPaid: 751.83,
    notes: "mocked base dto objects notes",
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
    jest.clearAllMocks();
    mockPrismaService.$transaction.mockImplementation((callback) => callback(mockPrismaService));
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
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });


  // Test case for ON-TIME payments
  it("successfully logging an ON-TIME payment", async () => {
    const dto = { ...baseDto };
    const mockPaymentRecord = { ...basePaymentRecord };
    const mockUpdateOccurance = {
      ...baseOccurrence,                    // use the base occurance
      status: PaymentOccurrenceStatus.PAID, // now update that base occurances status to PAID.
      paidAt: new Date(dto.paidDate), // and update that base occurances paidAt to the dto's date.

    };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(baseOccurrence);
    mockPrismaService.paymentRecord.create.mockResolvedValue(mockPaymentRecord);
    mockPrismaService.paymentOccurrence.update.mockResolvedValue(mockUpdateOccurance);

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
      }),
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
    expect(result.payment).toEqual(expect.objectContaining({
      id: mockPaymentRecord.id,
      amountPaid: 751.83,
      paymentStatus: PaymentRecordStatus.ON_TIME,
    }));
    expect(result.occurrence).toEqual(expect.objectContaining({
      id: mockUpdateOccurance.id,
      status: PaymentOccurrenceStatus.PAID,
    }));
    expect(result.scoreImpact).toEqual(expect.objectContaining({
      previousScore: 600,
      currentScore: 608,
      delta: 8,
    }));
    expect(result.rewards).toEqual(expect.objectContaining({
      coinsAwarded: 15,
      xpAwarded: 10,
      currentPaymentStreak: 1,
    }));
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

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(baseOccurrence);
    mockPrismaService.paymentRecord.create.mockResolvedValue(mockPaymentRecord);
    mockPrismaService.paymentOccurrence.update.mockResolvedValue(mockUpdatedOccurrence);
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
      }),
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

  it("should throw NotFoundExpectuon when occurenceId does not exist", async () => {
    const dto = {
      ...baseDto,
      occurrenceId: 'non-existing-occurence-id',
    };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(null);

    await expect(service.logPayment(dto, currentUserId)).rejects.toThrow(NotFoundException);

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

    await expect(service.logPayment(dto, differentUserId)).rejects.toThrow(NotFoundException);

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

    await expect(service.logPayment(dto, currentUserId)).rejects.toThrow(BadRequestException);

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

    await expect(service.logPayment(dto, currentUserId)).rejects.toThrow(BadRequestException);

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

    await expect(service.logPayment(dto, currentUserId)).rejects.toThrow(BadRequestException);

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

    await expect(service.logPayment(dto, currentUserId)).rejects.toThrow(BadRequestException);

    expect(mockPrismaService.paymentRecord.create).not.toHaveBeenCalled();
    expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();
  });

  //////////////////////////////////////////////////////////////////////////////

  it('should throw BadRequestException when dto.amountPaid does not equal occurrence.amountDue', async () => {
    const dto = {
      ...baseDto,
      amountPaid: 700, // use the base dto but change its amount form 713 to 700. 
    };

    mockPrismaService.paymentOccurrence.findFirst.mockResolvedValue(baseOccurrence)

    await expect(service.logPayment(dto, currentUserId)).rejects.toThrow(BadRequestException);

    expect(mockPrismaService.paymentRecord.create).not.toHaveBeenCalled();
    expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();
  });


  //////////////////////////////////////////////////////////////////////////////

});
