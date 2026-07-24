import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { RemindersModule } from '../reminders/reminders.module';
import { PaymentOccurrencesModule } from '../payment-occurrences/payment-occurrences.module';

@Module({
  imports: [RemindersModule, PaymentOccurrencesModule],
  exports: [SchedulerService],
  providers: [SchedulerService],
})
export class SchedulerModule {}
