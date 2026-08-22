import { Test, TestingModule } from '@nestjs/testing';
import { MonthlyWrappedService } from './monthly-wrapped.service';

describe('MonthlyWrappedService', () => {
  let service: MonthlyWrappedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonthlyWrappedService],
    }).compile();

    service = module.get<MonthlyWrappedService>(MonthlyWrappedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
