import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  NotificationType,
  Prisma,
  UserEventSourceType,
} from '@prisma/client/edge';
import { PrismaService } from '../prisma/prisma.service';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const prisma = {
    notification: {
      findMany: jest.fn<(args?: unknown) => Promise<unknown[]>>(),
      count: jest.fn<(args?: unknown) => Promise<number>>(),
      findFirst: jest.fn<(args?: unknown) => Promise<unknown>>(),
      update: jest.fn<(args?: unknown) => Promise<unknown>>(),
      updateMany: jest.fn<(args?: unknown) => Promise<{ count: number }>>(),
      create: jest.fn<(args?: unknown) => Promise<unknown>>(),
    },
    notificationPreference: {
      findUnique: jest.fn<(args?: unknown) => Promise<unknown>>(),
    },
    $transaction:
      jest.fn<(operations: Promise<unknown>[]) => Promise<unknown[]>>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prisma.notificationPreference.findUnique.mockResolvedValue({
      inAppEnabled: true,
    });

    prisma.$transaction.mockImplementation(
      async (operations: Promise<unknown>[]) => {
        return Promise.all(operations);
      },
    );

    service = new NotificationsService(prisma as unknown as PrismaService);
  });

  describe('findAllForUser', () => {
    it('returns notifications belonging to the supplied user', async () => {
      const notifications = [
        {
          id: 'notification-1',
          type: NotificationType.REMINDER,
          title: 'Payment reminder',
          message: 'Your payment is due soon.',
          sourceType: null,
          sourceId: null,
          readAt: null,
          createdAt: new Date(),
        },
      ];

      prisma.notification.findMany.mockResolvedValue(notifications);
      prisma.notification.count.mockResolvedValue(1);

      const result = await service.findAllForUser('user-1', {
        page: 1,
        perPage: 20,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 20,
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
      });

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          deletedAt: null,
        },
      });

      expect(result).toEqual({
        notifications,
        pagination: {
          page: 1,
          perPage: 20,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('filters unread notifications using readAt null', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.findAllForUser('user-1', {
        unreadOnly: true,
        page: 1,
        perPage: 20,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            deletedAt: null,
            readAt: null,
          },
        }),
      );

      expect(result.pagination.total).toBe(0);
    });

    it('filters notifications by notification type', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findAllForUser('user-1', {
        type: NotificationType.REMINDER,
        page: 1,
        perPage: 20,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            deletedAt: null,
            type: NotificationType.REMINDER,
          },
        }),
      );
    });

    it('applies pagination correctly', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(11);

      const result = await service.findAllForUser('user-1', {
        page: 2,
        perPage: 5,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );

      expect(result.pagination).toEqual({
        page: 2,
        perPage: 5,
        total: 11,
        totalPages: 3,
      });
    });

    it('uses default pagination when values are missing', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      const result = await service.findAllForUser(
        'user-1',
        new GetNotificationsQueryDto(),
      );

      expect(result.pagination).toEqual({
        page: 1,
        perPage: 20,
        total: 0,
        totalPages: 0,
      });
    });
  });

  describe('markAsRead', () => {
    it('returns an already-read notification without updating it', async () => {
      const existingNotification = {
        id: 'notification-1',
        userId: 'user-1',
        readAt: new Date(),
      };

      prisma.notification.findFirst.mockResolvedValue(existingNotification);

      const result = await service.markAsRead('user-1', 'notification-1');

      expect(result).toEqual(existingNotification);
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('sets readAt when the notification is unread', async () => {
      const unreadNotification = {
        id: 'notification-1',
        userId: 'user-1',
        readAt: null,
      };

      const updatedNotification = {
        ...unreadNotification,
        readAt: new Date(),
      };

      prisma.notification.findFirst.mockResolvedValue(unreadNotification);
      prisma.notification.update.mockResolvedValue(updatedNotification);

      const result = await service.markAsRead('user-1', 'notification-1');

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: {
          id: 'notification-1',
        },
        data: {
          readAt: expect.any(Date) as unknown,
        },
      });

      expect(result).toEqual(updatedNotification);
    });

    it('throws when the notification cannot be found', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.markAsRead('user-1', 'missing-notification'),
      ).rejects.toThrow(new NotFoundException('Notification not found'));

      expect(prisma.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('creates a notification with the supplied values', async () => {
      const createdNotification = {
        id: 'notification-1',
        userId: 'user-1',
        type: NotificationType.REMINDER,
        title: 'Payment reminder',
        message: 'Your payment is due soon.',
        sourceType: null,
        sourceId: null,
      };

      prisma.notification.create.mockResolvedValue(createdNotification);

      const result = await service.create({
        userId: 'user-1',
        type: NotificationType.REMINDER,
        title: 'Payment reminder',
        message: 'Your payment is due soon.',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: NotificationType.REMINDER,
          title: 'Payment reminder',
          message: 'Your payment is due soon.',
          sourceType: null,
          sourceId: null,
        },
      });

      expect(result).toEqual(createdNotification);
    });

    it('saves sourceType and sourceId', async () => {
      const sourceType = Object.values(UserEventSourceType)[0];

      prisma.notification.create.mockResolvedValue({
        id: 'notification-1',
      });

      await service.create({
        userId: 'user-1',
        type: NotificationType.REMINDER,
        title: 'Payment reminder',
        message: 'Your payment is due soon.',
        sourceType,
        sourceId: 'occurrence-1',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: NotificationType.REMINDER,
          title: 'Payment reminder',
          message: 'Your payment is due soon.',
          sourceType,
          sourceId: 'occurrence-1',
        },
      });
    });

    it('uses a supplied transaction client', async () => {
      const createdNotification = {
        id: 'notification-1',
        userId: 'user-1',
        type: NotificationType.SCORE_CHANGE,
        title: 'Credit score updated',
        message: 'Your simulated credit score increased.',
        sourceType: null,
        sourceId: 'score-event-1',
      };

      const transactionCreate = jest.fn<(args?: unknown) => Promise<unknown>>();
      const transactionFindUnique =
        jest.fn<(args?: unknown) => Promise<unknown>>();

      transactionCreate.mockResolvedValue(createdNotification);
      transactionFindUnique.mockResolvedValue({ inAppEnabled: true });

      const transactionClient = {
        notification: {
          create: transactionCreate,
        },
        notificationPreference: {
          findUnique: transactionFindUnique,
        },
      };

      const result = await service.create(
        {
          userId: 'user-1',
          type: NotificationType.SCORE_CHANGE,
          title: 'Credit score updated',
          message: 'Your simulated credit score increased.',
          sourceId: 'score-event-1',
        },
        transactionClient as unknown as Prisma.TransactionClient,
      );

      expect(transactionClient.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: NotificationType.SCORE_CHANGE,
          title: 'Credit score updated',
          message: 'Your simulated credit score increased.',
          sourceType: null,
          sourceId: 'score-event-1',
        },
      });

      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(result).toEqual(createdNotification);
    });

    it('does not make a notifications if the user has notifications disabled', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue({
        inAppEnabled: false,
      });

      const result = await service.create({
        userId: 'user-1',
        type: NotificationType.REMINDER,
        title: 'Payment reminder',
        message: 'Your payment is due soon.',
      });

      expect(prisma.notificationPreference.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: { inAppEnabled: true },
      });
      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('creates notifications when the user has no preference row', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue(null);

      prisma.notification.create.mockResolvedValue({
        id: 'notification-1',
      });

      const result = await service.create({
        userId: 'user-1',
        type: NotificationType.REMINDER,
        title: 'Payment reminder',
        message: 'Your payment is due soon.',
      });

      expect(prisma.notification.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 'notification-1' });
    });
  });

  describe('softDelete', () => {
    it('soft deletes a notification belonging to the user', async () => {
      const notification = {
        id: 'notification-1',
        userId: 'user-1',
        deletedAt: null,
      };

      prisma.notification.findFirst.mockResolvedValue(notification);
      prisma.notification.update.mockResolvedValue({
        ...notification,
        deletedAt: new Date(),
      });

      const result = await service.softDelete('user-1', 'notification-1');

      expect(prisma.notification.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'notification-1',
          userId: 'user-1',
          deletedAt: null,
        },
      });

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: {
          id: 'notification-1',
        },
        data: {
          deletedAt: expect.any(Date) as unknown,
        },
      });

      expect(result).toEqual({
        id: 'notification-1',
        deletedAt: expect.any(Date) as unknown,
      });
    });

    it('throws when the notification does not exist for the user', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      await expect(
        service.softDelete('user-1', 'missing-notification'),
      ).rejects.toThrow(new NotFoundException('Notification not found'));

      expect(prisma.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('markManyAsRead', () => {
    it('updates only unread, non-deleted notifications belonging to the user', async () => {
      const ids = [
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
      ];

      prisma.notification.updateMany.mockResolvedValue({
        count: 2,
      });

      const result = await service.markManyAsRead('user-1', ids);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ids,
          },
          userId: 'user-1',
          deletedAt: null,
          readAt: null,
        },
        data: {
          readAt: expect.any(Date) as unknown,
        },
      });

      expect(result).toEqual({
        updated: 2,
      });
    });

    it('returns zero when no notifications match', async () => {
      prisma.notification.updateMany.mockResolvedValue({
        count: 0,
      });

      const result = await service.markManyAsRead('user-1', [
        '11111111-1111-4111-8111-111111111111',
      ]);

      expect(result).toEqual({
        updated: 0,
      });
    });
  });

  describe('softDeleteMany', () => {
    it('soft deletes only non-deleted notifications belonging to the user', async () => {
      const ids = [
        '11111111-1111-4111-8111-111111111111',
        '22222222-2222-4222-8222-222222222222',
      ];

      prisma.notification.updateMany.mockResolvedValue({
        count: 2,
      });

      const result = await service.softDeleteMany('user-1', ids);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ids,
          },
          userId: 'user-1',
          deletedAt: null,
        },
        data: {
          deletedAt: expect.any(Date) as unknown,
        },
      });

      expect(result).toEqual({
        deleted: 2,
      });
    });

    it('returns zero when no notifications match', async () => {
      prisma.notification.updateMany.mockResolvedValue({
        count: 0,
      });

      const result = await service.softDeleteMany('user-1', [
        '11111111-1111-4111-8111-111111111111',
      ]);

      expect(result).toEqual({
        deleted: 0,
      });
    });
  });
});
