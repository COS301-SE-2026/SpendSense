import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotificationType } from '@prisma/client/edge';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UsersService } from '../users/users.service';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const notificationsService = {
    findAllForUser:
      jest.fn<
        (userId: string, query: GetNotificationsQueryDto) => Promise<unknown>
      >(),
    markAsRead:
      jest.fn<(userId: string, notificationId: string) => Promise<unknown>>(),
    softDelete:
      jest.fn<(userId: string, notificationId: string) => Promise<unknown>>(),
    markManyAsRead:
      jest.fn<(userId: string, ids: string[]) => Promise<unknown>>(),
    softDeleteMany:
      jest.fn<(userId: string, ids: string[]) => Promise<unknown>>(),
  };

  const usersService = {
    findOrCreateUser:
      jest.fn<(authUser: AuthUser) => Promise<{ id: string }>>(),
  };

  const authUser: AuthUser = {
    supabaseAuthId: 'supabase-user-1',
    email: 'student@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    usersService.findOrCreateUser.mockResolvedValue({
      id: 'database-user-1',
    });

    controller = new NotificationsController(
      notificationsService as unknown as NotificationsService,
      usersService as unknown as UsersService,
    );
  });

  describe('findAll', () => {
    it('lists notifications using the internal user ID', async () => {
      const query: GetNotificationsQueryDto = {
        unreadOnly: true,
        type: NotificationType.REMINDER,
        page: 1,
        perPage: 20,
      };

      const expectedResult = {
        notifications: [],
        pagination: {
          page: 1,
          perPage: 20,
          total: 0,
          totalPages: 0,
        },
      };

      notificationsService.findAllForUser.mockResolvedValue(expectedResult);

      const result = await controller.findAll(authUser, query);

      expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
      expect(notificationsService.findAllForUser).toHaveBeenCalledWith(
        'database-user-1',
        query,
      );
      expect(result).toEqual(expectedResult);
    });

    it('does not call the service when user resolution fails', async () => {
      const query = new GetNotificationsQueryDto();

      usersService.findOrCreateUser.mockRejectedValue(
        new Error('User not found'),
      );

      await expect(controller.findAll(authUser, query)).rejects.toThrow(
        'User not found',
      );

      expect(notificationsService.findAllForUser).not.toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('marks a notification as read using the internal user ID', async () => {
      const updatedNotification = {
        id: 'notification-1',
        userId: 'database-user-1',
        readAt: new Date(),
      };

      notificationsService.markAsRead.mockResolvedValue(updatedNotification);

      const result = await controller.markAsRead(authUser, 'notification-1');

      expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
      expect(notificationsService.markAsRead).toHaveBeenCalledWith(
        'database-user-1',
        'notification-1',
      );
      expect(result).toEqual(updatedNotification);
    });

    it('passes a NotFoundException from the service', async () => {
      notificationsService.markAsRead.mockRejectedValue(
        new NotFoundException('Notification not found'),
      );

      await expect(
        controller.markAsRead(authUser, 'missing-notification'),
      ).rejects.toThrow(new NotFoundException('Notification not found'));

      expect(notificationsService.markAsRead).toHaveBeenCalledWith(
        'database-user-1',
        'missing-notification',
      );
    });
  });

  describe('remove', () => {
    it('soft deletes one notification using the internal user ID', async () => {
      const resultValue = {
        id: 'notification-1',
        deletedAt: new Date(),
      };

      notificationsService.softDelete.mockResolvedValue(resultValue);

      const result = await controller.remove(authUser, 'notification-1');

      expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
      expect(notificationsService.softDelete).toHaveBeenCalledWith(
        'database-user-1',
        'notification-1',
      );
      expect(result).toEqual(resultValue);
    });

    it('does not call softDelete when user resolution fails', async () => {
      usersService.findOrCreateUser.mockRejectedValue(
        new Error('User not found'),
      );

      await expect(
        controller.remove(authUser, 'notification-1'),
      ).rejects.toThrow('User not found');

      expect(notificationsService.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('markManyAsRead', () => {
    it('marks the supplied notification IDs as read', async () => {
      const body = {
        ids: [
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222',
        ],
      };

      notificationsService.markManyAsRead.mockResolvedValue({
        updated: 2,
      });

      const result = await controller.markManyAsRead(authUser, body);

      expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
      expect(notificationsService.markManyAsRead).toHaveBeenCalledWith(
        'database-user-1',
        body.ids,
      );
      expect(result).toEqual({
        updated: 2,
      });
    });
  });

  describe('removeMany', () => {
    it('soft deletes the supplied notification IDs', async () => {
      const body = {
        ids: [
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222',
        ],
      };

      notificationsService.softDeleteMany.mockResolvedValue({
        deleted: 2,
      });

      const result = await controller.removeMany(authUser, body);

      expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
      expect(notificationsService.softDeleteMany).toHaveBeenCalledWith(
        'database-user-1',
        body.ids,
      );
      expect(result).toEqual({
        deleted: 2,
      });
    });
  });
});
