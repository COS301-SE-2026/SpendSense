import { Test, TestingModule } from '@nestjs/testing';
import { CreditScoreService } from './credit-score.service';

describe('CreditScoreService', () => {
  let service: CreditScoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CreditScoreService],
    }).compile();

    service = module.get<CreditScoreService>(CreditScoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
