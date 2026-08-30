import { RemindersService } from '../reminders/reminders.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Injectable, Logger } from '@nestjs/common';
import { PaymentOccurrencesService } from '../payment-occurrences/payment-occurrences.service';
import {
  NotificationType,
  PaymentOccurrenceStatus,
  PaymentRecordStatus,
  Prisma,
  WagerOutcome,
  WagerStatus,
  WagerTaskType,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RewardService } from '../rewards/reward.service';

const WAGER_INVITE_EXPIRY_MS = 48 * 60 * 60 * 1000;

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  constructor(
    private readonly remindersService: RemindersService,
    private readonly paymentOccurrencesService: PaymentOccurrencesService,
    private readonly prisma: PrismaService,
    private readonly rewardService: RewardService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async runScheduledJob() {
    const rslt = await this.runAll();
    this.logger.log(
      `Processed ${rslt.processedCount} due reminder(s), ${rslt.overdueTransitionedCount} occurrence(s) marked overdue, ${rslt.missedTransitionedCount} occurrence(s) marked missed, ${rslt.expiredWagerCount} wager invite(s) expired, ${rslt.resolvedWagerCount} wager(s) resolved`,
    );
  }

  async runAll() {
    const overdue =
      await this.paymentOccurrencesService.transitionOverdueOccurrences();
    const missed =
      await this.paymentOccurrencesService.transitionMissedOccurrence();
    const reminders = await this.remindersService.processDueReminders();
    const now = new Date();
    const expiredWagerCount = await this.expirePendingWagers(now);
    const resolvedWagerCount = await this.resolveDueWagers(now);

    return {
      overdueTransitionedCount: overdue.transitionedCount,
      missedTransitionedCount: missed.transitionedCount,
      processedCount: reminders.processedCount,
      expiredWagerCount,
      resolvedWagerCount,
    };
  }

  private async expirePendingWagers(now: Date) {
    const expiresBefore = new Date(now.getTime() - WAGER_INVITE_EXPIRY_MS);
    const expired = await this.prisma.wager.updateMany({
      where: {
        status: WagerStatus.PENDING,
        invitedAt: {
          lte: expiresBefore,
        },
      },
      data: {
        status: WagerStatus.EXPIRED,
      },
    });
    return expired.count;
  }
  private async resolveDueWagers(now: Date) {
    const dueWagers = await this.prisma.wager.findMany({
      where: {
        status: WagerStatus.ACTIVE,
        endDate: {
          lte: now,
        },
      },
      select: {
        id: true,
      },
    });
    let resolvedWagerCount = 0;
    for (const wager of dueWagers) {
      const resolved = await this.resolveWager(wager.id, now);
      if (resolved) {
        resolvedWagerCount += 1;
      }
    }
    return resolvedWagerCount;
  }
  private async resolveWager(wagerId: string, now: Date) {
    return this.prisma.$transaction(async (tx) => {
      const wager = await tx.wager.findUnique({
        where: {
          id: wagerId,
        },
        select: {
          id: true,
          creatorId: true,
          opponentId: true,
          taskType: true,
          stakeAmount: true,
          status: true,
          startDate: true,
          endDate: true,
          taskSnapshot: true,
          creator: {
            select: {
              displayName: true,
              deletedAt: true,
            },
          },
          opponent: {
            select: {
              displayName: true,
              deletedAt: true,
            },
          },
        },
      });
      if (
        !wager ||
        wager.status !== WagerStatus.ACTIVE ||
        !wager.startDate ||
        !wager.endDate ||
        wager.endDate > now
      ) {
        return false;
      }
      const claimed = await tx.wager.updateMany({
        where: {
          id: wager.id,
          status: WagerStatus.ACTIVE,
        },
        data: {
          status: WagerStatus.COMPLETED,
          resolvedAt: now,
        },
      });
      if (claimed.count === 0) {
        return false;
      }
      const { creatorSuccess, opponentSuccess } =
        await this.getWagerTaskResults(tx, wager);
      const creatorOutcome = this.getWagerOutcome(
        creatorSuccess,
        opponentSuccess,
      );
      const opponentOutcome = this.getWagerOutcome(
        opponentSuccess,
        creatorSuccess,
      );
      if (creatorOutcome === WagerOutcome.DRAW) {
        await this.rewardService.adjustCoins(tx, {
          userId: wager.creatorId,
          amount: wager.stakeAmount,
          reason: 'Wager draw - stake returned',
        });
        await this.rewardService.adjustCoins(tx, {
          userId: wager.opponentId,
          amount: wager.stakeAmount,
          reason: 'Wager draw - stake returned',
        });
      } else {
        const winnerId =
          creatorOutcome === WagerOutcome.WON
            ? wager.creatorId
            : wager.opponentId;
        const opponentName =
          creatorOutcome === WagerOutcome.WON
            ? (wager.opponent.displayName ?? 'SpendSense user')
            : (wager.creator.displayName ?? 'SpendSense user');
        await this.rewardService.grantCoins(tx, {
          userId: winnerId,
          amount: wager.stakeAmount * 2,
          reason: `Wager won vs ${opponentName}`,
        });
      }
      await tx.wager.update({
        where: {
          id: wager.id,
        },
        data: {
          creatorOutcome,
          opponentOutcome,
        },
      });
      await this.notificationsService.create(
        {
          userId: wager.creatorId,
          type: NotificationType.WAGER_RESULT,
          title: 'Wager result',
          message: this.getResultMessage(creatorOutcome),
          sourceId: wager.id,
        },
        tx,
      );
      await this.notificationsService.create(
        {
          userId: wager.opponentId,
          type: NotificationType.WAGER_RESULT,
          title: 'Wager result',
          message: this.getResultMessage(opponentOutcome),
          sourceId: wager.id,
        },
        tx,
      );
      return true;
    });
  }
  private async getWagerTaskResults(
    tx: Prisma.TransactionClient,
    wager: {
      creatorId: string;
      opponentId: string;
      taskType: WagerTaskType;
      startDate: Date;
      endDate: Date;
      taskSnapshot: Prisma.JsonValue | null;
      creator: { deletedAt: Date | null };
      opponent: { deletedAt: Date | null };
    },
  ) {
    if (wager.creator.deletedAt && wager.opponent.deletedAt) {
      return { creatorSuccess: false, opponentSuccess: false };
    }
    if (wager.creator.deletedAt) {
      return { creatorSuccess: false, opponentSuccess: true };
    }
    if (wager.opponent.deletedAt) {
      return { creatorSuccess: true, opponentSuccess: false };
    }
    const creatorSuccess = await this.evaluateWagerTask(
      tx,
      wager.creatorId,
      wager.taskType,
      wager.startDate,
      wager.endDate,
      wager.taskSnapshot,
      'creatorCurrentPaymentStreak',
    );
    const opponentSuccess = await this.evaluateWagerTask(
      tx,
      wager.opponentId,
      wager.taskType,
      wager.startDate,
      wager.endDate,
      wager.taskSnapshot,
      'opponentCurrentPaymentStreak',
    );
    return { creatorSuccess, opponentSuccess };
  }
  private getWagerOutcome(success: boolean, opponentSuccess: boolean) {
    if (success === opponentSuccess) {
      return WagerOutcome.DRAW;
    }
    if (success) {
      return WagerOutcome.WON;
    }
    return WagerOutcome.LOST;
  }

  private async evaluateWagerTask(
    tx: Prisma.TransactionClient,
    userId: string,
    taskType: WagerTaskType,
    startDate: Date,
    endDate: Date,
    taskSnapshot: Prisma.JsonValue | null,
    streakSnapshotKey: string,
  ) {
    if (taskType === WagerTaskType.MAINTAIN_PAYMENT_STREAK) {
      const startingStreak = this.getSnapshotNumber(
        taskSnapshot,
        streakSnapshotKey,
      );
      if (startingStreak === null) {
        return false;
      }
      const profile = await tx.gamificationProfile.findUnique({
        where: {
          userId,
        },
        select: {
          currentPaymentStreak: true,
        },
      });
      return (profile?.currentPaymentStreak ?? 0) >= startingStreak;
    }
    const occurrences = await tx.paymentOccurrence.findMany({
      where: {
        userId,
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
      select: {
        status: true,
        payment: {
          select: {
            paymentStatus: true,
            deletedAt: true,
          },
        },
      },
    });
    if (taskType === WagerTaskType.ALL_PAYMENTS_ON_TIME) {
      return occurrences.every(
        (occurrence) =>
          occurrence.payment !== null &&
          occurrence.payment.deletedAt === null &&
          occurrence.payment.paymentStatus === PaymentRecordStatus.ON_TIME,
      );
    }
    if (taskType === WagerTaskType.NO_MISSED_PAYMENTS) {
      return occurrences.every(
        (occurrence) => occurrence.status !== PaymentOccurrenceStatus.MISSED,
      );
    }
    return false;
  }
  private getSnapshotNumber(
    taskSnapshot: Prisma.JsonValue | null,
    key: string,
  ) {
    if (
      taskSnapshot === null ||
      Array.isArray(taskSnapshot) ||
      typeof taskSnapshot !== 'object'
    ) {
      return null;
    }
    const value = taskSnapshot[key];
    return typeof value === 'number' ? value : null;
  }

  private getResultMessage(outcome: WagerOutcome) {
    if (outcome === WagerOutcome.WON) {
      return 'You won your wager.';
    }
    if (outcome === WagerOutcome.LOST) {
      return 'You lost your wager.';
    }
    return 'Your wager ended in a draw. Your stake was returned.';
  }
}
