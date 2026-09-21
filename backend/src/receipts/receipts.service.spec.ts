import { Test, TestingModule } from '@nestjs/testing';
import { ReceiptsService } from './receipts.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentContributionsService } from '../payments/payment-contributions.service';
const mockPaymentContributionsService = {
  createContribution: jest.fn(),
};

describe('ReceiptsService', () => {
  let service: ReceiptsService;

  const mockPrismaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceiptsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PaymentContributionsService,
          useValue: mockPaymentContributionsService,
        },
      ],
    }).compile();

    service = module.get<ReceiptsService>(ReceiptsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
