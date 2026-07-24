import 'reflect-metadata';
import {NotFoundException} from '@nestjs/common';
import {beforeEach,describe,expect,it,jest,} from '@jest/globals';
import {NotificationType} from '@prisma/client/edge';
import type {AuthUser} from '../auth/types/auth-user.type';
import {GetNotificationsQueryDto} from './dto/get-notifications-query.dto';
import {NotificationsController} from './notifications.controller';
import {NotificationsService} from './notifications.service';

describe('NotificationsController',()=>{
    let controller:NotificationsController;
    const notificationsService={
        findAllForUser:jest.fn<(userId:string,query:GetNotificationsQueryDto)=>Promise<unknown>>(),
        markAsRead:jest.fn<(userId:string,notificationId:string)=>Promise<unknown>>(),
    };
    const authUser:AuthUser={
        supabaseAuthId:'supabase-user-1',
        email:'student@example.com',
    };
    beforeEach(()=>{
        jest.clearAllMocks();
        controller=new NotificationsController(notificationsService as unknown as NotificationsService);
    });
    describe('findAll',()=>{
        it('lists notifications using the internal user ID',async()=>{
            const query:GetNotificationsQueryDto={
                unreadOnly:true,
                type:NotificationType.REMINDER,
                page:1,
                perPage:20,
            };
            const expectedResult={
                notifications:[],
                pagination:{
                    page:1,
                    perPage:20,
                    total:0,
                    totalPages:0,
                },
            };
            const controllerWithResolver=controller as unknown as {
                resolveInternalUserId(
                    authUser:AuthUser,
                ):Promise<string>;
            };
            jest.spyOn(controllerWithResolver,'resolveInternalUserId').mockResolvedValue('database-user-1');
            notificationsService.findAllForUser.mockResolvedValue(expectedResult);
            const result=await controller.findAll(
                authUser,
                query,
            );
            expect(controllerWithResolver.resolveInternalUserId).toHaveBeenCalledWith(authUser);
            expect(notificationsService.findAllForUser).toHaveBeenCalledWith(
                'database-user-1',
                query,
            );
            expect(result).toEqual(expectedResult);
        });
        it('does not call the service when user resolution fails',async()=>{
            const query=new GetNotificationsQueryDto();
            const controllerWithResolver=controller as unknown as {
                resolveInternalUserId(
                    authUser:AuthUser,
                ):Promise<string>;
            };
            jest.spyOn(controllerWithResolver,'resolveInternalUserId').mockRejectedValue(new Error('User not found'));
            await expect(controller.findAll(
                    authUser,
                    query,
                ),
            ).rejects.toThrow('User not found');
            expect(notificationsService.findAllForUser).not.toHaveBeenCalled();
        });
    });
    describe('markAsRead',()=>{
        it('marks a notification as read using the internal user ID',async()=>{
            const updatedNotification={
                id:'notification-1',
                userId:'database-user-1',
                readAt:new Date(),
            };
            const controllerWithResolver=controller as unknown as {
                resolveInternalUserId(
                    authUser:AuthUser,
                ):Promise<string>;
            };
            jest.spyOn(
                controllerWithResolver,
                'resolveInternalUserId',
            ).mockResolvedValue('database-user-1');
            notificationsService.markAsRead.mockResolvedValue(
                updatedNotification,
            );
            const result=await controller.markAsRead(
                authUser,
                'notification-1',
            );
            expect(controllerWithResolver.resolveInternalUserId).toHaveBeenCalledWith(authUser);
            expect(notificationsService.markAsRead).toHaveBeenCalledWith(
                'database-user-1',
                'notification-1',
            );
            expect(result).toEqual(updatedNotification);
        });
        it('passes a NotFoundException from the service',async()=>{
            const controllerWithResolver=controller as unknown as {
                resolveInternalUserId(
                    authUser:AuthUser,
                ):Promise<string>;
            };
            jest.spyOn(
                controllerWithResolver,
                'resolveInternalUserId',
            ).mockResolvedValue('database-user-1');
            notificationsService.markAsRead.mockRejectedValue(new NotFoundException('Notification not found'));
            await expect(controller.markAsRead(
                    authUser,
                    'missing-notification',
                ),
            ).rejects.toThrow(
                new NotFoundException('Notification not found',),
            );
            expect(notificationsService.markAsRead).toHaveBeenCalledWith(
                'database-user-1',
                'missing-notification',
            );
        });
        it('does not call the service when user resolution fails',async()=>{
            const controllerWithResolver=controller as unknown as {
                resolveInternalUserId(authUser:AuthUser):Promise<string>;
            };
            jest.spyOn(
                controllerWithResolver,
                'resolveInternalUserId',
            ).mockRejectedValue(new Error('User not found'));
            await expect(
                controller.markAsRead(
                    authUser,
                    'notification-1',
                ),
            ).rejects.toThrow('User not found');
            expect(notificationsService.markAsRead).not.toHaveBeenCalled();
        });
    });
});