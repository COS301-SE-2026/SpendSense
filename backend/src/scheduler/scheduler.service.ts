import { RemindersService } from '../reminders/reminders.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Injectable, Logger } from '@nestjs/common';
import { PaymentOccurrencesService } from '../payment-occurrences/payment-occurrences.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  constructor(
    private readonly remindersService: RemindersService,
    private readonly paymentOccurrencesService: PaymentOccurrencesService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async runScheduledJob() {
    const rslt = await this.runAll();
    this.logger.log(
      `Processed ${rslt.processedCount} due reminder(s), ${rslt.overdueTransitionedCount} occurrence(s) marked overdue, ${rslt.missedTransitionedCount} occurrence(s) marked missed`,
    );
  }

  async runAll() {
    const overdue =
      await this.paymentOccurrencesService.transitionOverdueOccurrences();
    const missed =
      await this.paymentOccurrencesService.transitionMissedOccurrence();
    const reminders = await this.remindersService.processDueReminders();

    return {
      overdueTransitionedCount: overdue.transitionedCount,
      missedTransitionedCount: missed.transitionedCount,
      processedCount: reminders.processedCount,
    };
  }
}
