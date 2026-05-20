import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Currency, PaymentOccurrenceStatus, PaymentRecordStatus, Prisma, } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// to run the tests in this file by itself: npm test -- payments.service.spec.ts
describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPrismaService = {

    paymentOccurrence: {
      findUnique: jest.fn(), // the occuranceId has to exits and be unique
      update: jest.fn(),
    },

    paymentRecord: {
      create: jest.fn(), // we're going to be creating a PaymentRecord
    },
  };

  // this is what is a PaymentOccurance that is expected of the user
  const baseOccurrence = {
    id: 'baseOccurrence-id',
    userId: 'user-id',
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

    mockPrismaService.paymentOccurrence.findUnique.mockResolvedValue(baseOccurrence);
    mockPrismaService.paymentRecord.create.mockResolvedValue(mockPaymentRecord);
    mockPrismaService.paymentOccurrence.update.mockResolvedValue(mockUpdateOccurance);

    const result = await service.logPayment(dto);

    expect(mockPrismaService.paymentOccurrence.findUnique).toHaveBeenCalledWith({
      where: {
        id: dto.occurrenceId,
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
    expect(result.paymentRecord).toEqual(mockPaymentRecord);
    expect(result.occurrence).toEqual(mockUpdateOccurance);
    expect(result.isLate).toBe(false);
    expect(result.daysLate).toBe(0);
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
    };

    const mockUpdatedOccurrence = {
      ...baseOccurrence,
      status: PaymentOccurrenceStatus.PAID_LATE,
      paidAt: new Date(dto.paidDate),
    };

    mockPrismaService.paymentOccurrence.findUnique.mockResolvedValue(baseOccurrence);
    mockPrismaService.paymentRecord.create.mockResolvedValue(mockPaymentRecord);
    mockPrismaService.paymentOccurrence.update.mockResolvedValue(mockUpdatedOccurrence);

    const result = await service.logPayment(dto);

    console.log(result) ;

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

    

    expect(result.isLate).toBe(true);
    expect(result.daysLate).toBe(3);
    expect(result.simulatedInterestCalculation).toBe(6);
  });

  

  //////////////////////////////////////////////////////////////////////////////
  it("should throw NotFoundExpectuon when occurenceId does not exist", async () => {
    const dto = {
      ...baseDto,
      occurrenceId: 'non-existing-occurence-id',
    };

    mockPrismaService.paymentOccurrence.findUnique.mockResolvedValue(null);

    await expect(service.logPayment(dto)).rejects.toThrow(NotFoundException);

    expect(mockPrismaService.paymentRecord.create).not.toHaveBeenCalled();
    expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();

  });
  //////////////////////////////////////////////////////////////////////////////

  

  //////////////////////////////////////////////////////////////////////////////


  it('should throw BadRequestException when occurrence is already PAID', async () => {
    const dto = { ...baseDto };

    mockPrismaService.paymentOccurrence.findUnique.mockResolvedValue({
      ...baseOccurrence, // use that base occurance
      status: PaymentOccurrenceStatus.PAID, // but it has a PAID status instead. 
    });

    await expect(service.logPayment(dto)).rejects.toThrow(BadRequestException);

    expect(mockPrismaService.paymentRecord.create).not.toHaveBeenCalled();
    expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();
  });

  
  //////////////////////////////////////////////////////////////////////////////


  it('should throw BadRequestException when occurrence is already PAID', async () => {
    const dto = { ...baseDto };

    mockPrismaService.paymentOccurrence.findUnique.mockResolvedValue({
      ...baseOccurrence, // use that base occurance
      status: PaymentOccurrenceStatus.PAID_LATE, // but it has a PAID status instead. 
    });

    await expect(service.logPayment(dto)).rejects.toThrow(BadRequestException);

    expect(mockPrismaService.paymentRecord.create).not.toHaveBeenCalled();
    expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();
  });

    //////////////////////////////////////////////////////////////////////////////


  it('should throw BadRequestException when occurrence is already MISSED', async () => {
    const dto = { ...baseDto };

    mockPrismaService.paymentOccurrence.findUnique.mockResolvedValue({
      ...baseOccurrence, // use that base occurance
      status: PaymentOccurrenceStatus.MISSED, // but it has a PAID status instead. 
    });

    await expect(service.logPayment(dto)).rejects.toThrow(BadRequestException);

    expect(mockPrismaService.paymentRecord.create).not.toHaveBeenCalled();
    expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();
  });
  

    //////////////////////////////////////////////////////////////////////////////


  it('should throw BadRequestException when occurrence is already CANCELLED', async () => {
    const dto = { ...baseDto };

    mockPrismaService.paymentOccurrence.findUnique.mockResolvedValue({
      ...baseOccurrence, // use that base occurance
      status: PaymentOccurrenceStatus.CANCELLED, // but it has a PAID status instead. 
    });

    await expect(service.logPayment(dto)).rejects.toThrow(BadRequestException);

    expect(mockPrismaService.paymentRecord.create).not.toHaveBeenCalled();
    expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();
  });

  //////////////////////////////////////////////////////////////////////////////

  it('should throw BadRequestException when dto.amountPaid does not equal occurrence.amountDue', async () => {
    const dto = { 
      ...baseDto ,
      amountPaid: 700, // use the base dto but change its amount form 713 to 700. 
    };

    mockPrismaService.paymentOccurrence.findUnique.mockResolvedValue(baseOccurrence)

    await expect(service.logPayment(dto)).rejects.toThrow(BadRequestException);

    expect(mockPrismaService.paymentRecord.create).not.toHaveBeenCalled();
    expect(mockPrismaService.paymentOccurrence.update).not.toHaveBeenCalled();
  });


  //////////////////////////////////////////////////////////////////////////////

});
