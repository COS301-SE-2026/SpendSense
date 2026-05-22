import { Test, TestingModule } from '@nestjs/testing';
import { PaymentOccurrencesService } from './payment-occurrences.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PaymentOccurrencesService', () => {
  let service: PaymentOccurrencesService;

  const mockPrismaService = {
    paymentOccurrence: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentOccurrencesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PaymentOccurrencesService>(PaymentOccurrencesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
