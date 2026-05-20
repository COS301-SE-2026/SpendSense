import { Test, TestingModule } from '@nestjs/testing';
import { CreditProfileController } from './credit-profile.controller';

describe('CreditProfileController', () => {
  let controller: CreditProfileController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreditProfileController],
    }).compile();

    controller = module.get<CreditProfileController>(CreditProfileController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
