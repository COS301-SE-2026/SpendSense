import { Test, TestingModule } from '@nestjs/testing';
import { MonthlyWrappedService } from './wrapped.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MonthlyWrappedService', () => {
  let service: MonthlyWrappedService;

  const prismaMock = {
    userBadge: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonthlyWrappedService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<MonthlyWrappedService>(MonthlyWrappedService);

    jest.clearAllMocks();
  });

  it('getBadgesForMonth() shold return badges earned during the specified month', async () => {
    prismaMock.userBadge.findMany.mockResolvedValue([
      {
        earnedAt: new Date('2026-08-05T10:00:00.000Z'),
        badgeDefinition: {
          code: 'FIRST_PAYMENT',
          name: 'First Payment',
          description: 'Made your first payment',
          category: 'PAYMENTS',
          iconKey: 'first-payment',
        },
      },
      {
        earnedAt: new Date('2026-08-20T10:00:00.000Z'),
        badgeDefinition: {
          code: 'PAYMENT_STREAK',
          name: 'Payment Streak',
          description: 'Maintained a payment streak',
          category: 'PAYMENTS',
          iconKey: 'payment-streak',
        },
      },
    ]);

    const response = await service.getBadgesForMonth('mock-user-id', 2026, 8);
    expect(response.badgesEarned).toBe(2);
    expect(response.year).toBe(2026);
    expect(response.month).toBe(8);
    expect(response.badges).toHaveLength(2);
  });
});
