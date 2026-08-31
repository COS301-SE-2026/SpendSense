import { Module } from '@nestjs/common';
import { MonthlyWrappedController } from './wrapped.controller';
import { MonthlyWrappedService } from './wrapped.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

import { InsightsModule } from 'src/insights/insights.module';
import { CreditScoreModule } from 'src/credit-score/credit-score.module';

@Module({
  imports: [AuthModule, UsersModule, InsightsModule, CreditScoreModule],
  controllers: [MonthlyWrappedController],
  providers: [MonthlyWrappedService],
})
export class MonthlyWrappedModule {}
