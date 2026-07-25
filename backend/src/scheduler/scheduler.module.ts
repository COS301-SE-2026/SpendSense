import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { RemindersModule } from '../reminders/reminders.module';
import { PaymentOccurrencesModule } from '../payment-occurrences/payment-occurrences.module';
import { SchedulerController } from './scheduler.controller';

@Module({
  imports: [RemindersModule, PaymentOccurrencesModule],
  exports: [SchedulerService],
  providers: [SchedulerService],
  controllers: [SchedulerController],
})
export class SchedulerModule {}
