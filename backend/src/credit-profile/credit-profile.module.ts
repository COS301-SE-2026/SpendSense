import { Module } from '@nestjs/common';
import { CreditProfileController } from './credit-profile.controller';
import { CreditProfileService } from './credit-profile.service';

@Module({
  controllers: [CreditProfileController],
  providers: [CreditProfileService]
})
export class CreditProfileModule {}
