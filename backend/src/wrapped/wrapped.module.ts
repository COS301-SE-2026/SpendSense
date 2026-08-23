import { Module } from '@nestjs/common';
import { MonthlyWrappedController } from './wrapped.controller';
import { MonthlyWrappedService } from './wrapped.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [MonthlyWrappedController],
  providers: [MonthlyWrappedService],
})
export class MonthlyWrappedModule {}
