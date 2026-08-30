import { RemindersService } from '../reminders/reminders.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Injectable, Logger } from '@nestjs/common';
import { MascotMood } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentOccurrencesService } from '../payment-occurrences/payment-occurrences.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly remindersService: RemindersService,
    private readonly paymentOccurrencesService: PaymentOccurrencesService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async runScheduledJob() {
    const rslt = await this.runAll();

    this.logger.log(
      `Processed ${rslt.processedCount} due reminder(s), ` +
        `${rslt.overdueTransitionedCount} occurrence(s) marked overdue, ` +
        `${rslt.missedTransitionedCount} occurrence(s) marked missed, ` +
        `${rslt.mascotMoodsDecayedCount} mascot mood decayed`,
    );
  }

  async runAll() {
    const overdue =
      await this.paymentOccurrencesService.transitionOverdueOccurrences();

    const missed =
      await this.paymentOccurrencesService.transitionMissedOccurrence();

    const reminders = await this.remindersService.processDueReminders();

    const mascotMoodsDecayedCount = await this.decayMascotMoods();

    return {
      overdueTransitionedCount: overdue.transitionedCount,
      missedTransitionedCount: missed.transitionedCount,
      processedCount: reminders.processedCount,
      mascotMoodsDecayedCount,
    };
  }

  async decayMascotMoods(now = new Date()): Promise<number> {
    const celebratingCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const standardCutoff = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    const profiles = await this.prisma.gamificationProfile.findMany({
      where: {
        OR: [
          {
            mascotMood: MascotMood.CELEBRATING,
            mascotMoodUpdatedAt: {
              lte: celebratingCutoff,
            },
          },
          {
            mascotMood: {
              in: [MascotMood.HAPPY, MascotMood.SAD, MascotMood.STRESSED],
            },
            mascotMoodUpdatedAt: {
              lte: standardCutoff,
            },
          },
        ],
      },
      select: {
        id: true,
        mascotMood: true,
        mascotMoodUpdatedAt: true,
      },
    });

    let decayedCount = 0;

    for (const profile of profiles) {
      if (!profile.mascotMoodUpdatedAt) {
        continue;
      }

      const result = await this.prisma.gamificationProfile.updateMany({
        where: {
          id: profile.id,
          mascotMood: profile.mascotMood,
          mascotMoodUpdatedAt: profile.mascotMoodUpdatedAt,
        },
        data: {
          mascotMood: MascotMood.NEUTRAL,
          mascotMoodUpdatedAt: now,
        },
      });

      decayedCount += result.count;
    }

    return decayedCount;
  }
}
