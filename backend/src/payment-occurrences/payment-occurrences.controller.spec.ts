import { Test, TestingModule } from '@nestjs/testing';
import { PaymentOccurrencesController } from './payment-occurrences.controller';

describe('PaymentOccurrencesController', () => {
  let controller: PaymentOccurrencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentOccurrencesController],
    }).compile();

    controller = module.get<PaymentOccurrencesController>(PaymentOccurrencesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
