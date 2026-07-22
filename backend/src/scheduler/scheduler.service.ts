import { RemindersService } from '../reminders/reminders.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  constructor(private readonly remindersService: RemindersService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async runScheduledJob() {
    const rslt = this.remindersService.processDueReminders();
    this.logger.log(`Processed ${(await rslt).processedCount} due reminder(s)`);
  }
}
