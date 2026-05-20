import { Test, TestingModule } from '@nestjs/testing';
import { PaymentOccurrencesController } from './payment-occurrences.controller';
import { PaymentOccurrencesService } from './payment-occurrences.service';
import { UsersService } from '../users/users.service';

describe('PaymentOccurrencesController', () => {
  let controller: PaymentOccurrencesController;

  const mockPaymentOccurrencesService = {};
  const mockUsersService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentOccurrencesController],
      providers: [
        {
          provide: PaymentOccurrencesService,
          useValue: mockPaymentOccurrencesService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<PaymentOccurrencesController>(
      PaymentOccurrencesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});