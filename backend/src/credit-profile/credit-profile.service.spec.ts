import { Test, TestingModule } from '@nestjs/testing';
import { CreditProfileService } from './credit-profile.service';

describe('CreditProfileService', () => {
  let service: CreditProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CreditProfileService],
    }).compile();

    service = module.get<CreditProfileService>(CreditProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
