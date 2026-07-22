import { Test, TestingModule } from '@nestjs/testing';
import { CreditScoreController } from './credit-score.controller';

describe('CreditScoreController', () => {
  let controller: CreditScoreController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreditScoreController],
    }).compile();

    controller = module.get<CreditScoreController>(CreditScoreController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
