import { Test, TestingModule } from '@nestjs/testing';
import { PaymentOccurrencesService } from './payment-occurrences.service';

describe('PaymentOccurrencesService', () => {
  let service: PaymentOccurrencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaymentOccurrencesService],
    }).compile();

    service = module.get<PaymentOccurrencesService>(PaymentOccurrencesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
