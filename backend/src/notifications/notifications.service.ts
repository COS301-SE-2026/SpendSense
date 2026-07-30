import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client/edge';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationInput } from './dto/create-notification.dto';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}
  async findAllForUser(userId: string, filters: GetNotificationsQueryDto) {
    const page = filters.page ?? 1;
    const perPage = filters.perPage ?? 20;
    const where: Prisma.NotificationWhereInput = {
      userId,
      deletedAt: null,
    };
    if (filters.unreadOnly === true) {
      where.readAt = null;
    }
    if (filters.type !== undefined) {
      where.type = filters.type;
    }
    const [notifications, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          sourceType: true,
          sourceId: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({
        where,
      }),
    ]);
    return {
      notifications,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }
  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        deletedAt: null,
      },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.readAt !== null) {
      return notification;
    }
    return this.prisma.notification.update({
      where: {
        id: notification.id,
      },
      data: {
        readAt: new Date(),
      },
    });
  }
  async create(
    input: CreateNotificationInput,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const preference = await client.notificationPreference.findUnique({
      where: { userId: input.userId },
      select: { inAppEnabled: true },
    });

    if (preference?.inAppEnabled === false) {
      return null;
    }

    return client.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
      },
    });
  }
  async softDelete(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        deletedAt: null,
      },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    await this.prisma.notification.update({
      where: {
        id: notification.id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
    return { id: notification.id, deletedAt: new Date() };
  }
  async markManyAsRead(userId: string, ids: string[]) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: ids },
        userId,
        deletedAt: null,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
    return { updated: result.count };
  }
  async softDeleteMany(userId: string, ids: string[]) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: ids },
        userId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });
    return { deleted: result.count };
  }
}
