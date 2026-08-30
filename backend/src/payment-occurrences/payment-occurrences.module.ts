import { Module } from '@nestjs/common';
import { PaymentOccurrencesController } from './payment-occurrences.controller';
import { PaymentOccurrencesService } from './payment-occurrences.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { RewardModule } from '../rewards/reward.module';
import { CreditScoreModule } from '../credit-score/credit-score.module';

@Module({
  imports: [AuthModule, UsersModule, RewardModule, CreditScoreModule],
  controllers: [PaymentOccurrencesController],
  providers: [PaymentOccurrencesService],
  exports: [PaymentOccurrencesService],
})
export class PaymentOccurrencesModule {}
