import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { RemindersModule } from '../reminders/reminders.module';
import { PaymentOccurrencesModule } from '../payment-occurrences/payment-occurrences.module';
import { SchedulerController } from './scheduler.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RewardModule } from '../rewards/reward.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    RemindersModule,
    PaymentOccurrencesModule,
    PrismaModule,
    RewardModule,
    NotificationsModule,
  ],
  exports: [SchedulerService],
  providers: [SchedulerService],
  controllers: [SchedulerController],
})
export class SchedulerModule {}
