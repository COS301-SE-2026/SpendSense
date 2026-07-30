import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { UpdateReminderPreferencesDto } from './dto/update-reminder-preferences.dto';
import { NotificationsService } from '../notifications/notifications.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import {
  ReminderStatus,
  NotificationType,
  UserEventSourceType,
  Reminder,
  Prisma,
} from '@prisma/client';

@Injectable()
export class RemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly notificationService: NotificationsService,
  ) {}

  async getReminderPreferences(authUser: AuthUser) {
    const user = await this.usersService.findOrCreateUser(authUser);

    return user.notificationPreference;
  }

  async updateReminderPreferences(
    authUser: AuthUser,
    dto: UpdateReminderPreferencesDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);

    return this.prisma.notificationPreference.update({
      where: { userId: user.id },
      data: dto,
      select: this.reminderPreferenceSelect,
    });
  }

  async processDueReminders() {
    const now = new Date();
    const dueReminders = await this.prisma.reminder.findMany({
      where: {
        status: ReminderStatus.SCHEDULED,
        scheduledFor: {
          lte: now,
        },
        sentAt: null,
      },
    });

    let countProcessed = 0;

    for (const reminder of dueReminders) {
      await this.prisma.$transaction(async (transaction) => {
        await this.createReminderNotification(transaction, reminder);
        await transaction.reminder.update({
          where: {
            id: reminder.id,
          },

          data: {
            status: ReminderStatus.SENT,
            sentAt: now,
          },
        });
      });

      countProcessed++;
    }

    return { processedCount: countProcessed };
  }

  private readonly reminderPreferenceSelect = {
    quietHoursStart: true,
    quietHoursEnd: true,
    emailEnabled: true,
    pushEnabled: true,
    inAppEnabled: true,
    smsEnabled: true,
    defaultReminderDaysBefore: true,
  };

  private async createReminderNotification(
    transaction: Prisma.TransactionClient,
    reminder: Reminder,
  ) {
    return this.notificationService.create(
      {
        userId: reminder.userId,
        type: NotificationType.REMINDER,
        title: 'Payment reminder',
        message: reminder.message ?? 'You have a payment coming up soon.',
        sourceType: UserEventSourceType.PAYMENT_OCCURRENCE,
        sourceId: reminder.occurrenceId,
      },
      transaction,
    );
  }
}
