import { Module } from '@nestjs/common';
import { MonthlyWrappedController } from './wrapped.controller';
import { MonthlyWrappedService } from './wrapped.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

import { InsightsModule } from 'src/insights/insights.module';

@Module({
  imports: [AuthModule, UsersModule, InsightsModule],
  controllers: [MonthlyWrappedController],
  providers: [MonthlyWrappedService],
})
export class MonthlyWrappedModule {}
