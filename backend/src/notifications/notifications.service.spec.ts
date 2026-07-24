import 'reflect-metadata';
import {NotFoundException} from '@nestjs/common';
import {beforeEach,describe,expect,it,jest,} from '@jest/globals';
import {NotificationType,UserEventSourceType} from '@prisma/client/edge';
import {PrismaService} from '../prisma/prisma.service';
import {NotificationsService} from './notifications.service';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';

describe('NotificationsService',()=>{
    let service:NotificationsService;
    const prisma={
        notification:{
            findMany:jest.fn<(args?:unknown)=>Promise<unknown[]>>(),
            count:jest.fn<(args?:unknown)=>Promise<number>>(),
            findFirst:jest.fn<(args?:unknown)=>Promise<unknown|null>>(),
            update:jest.fn<(args?:unknown)=>Promise<unknown>>(),
            create:jest.fn<(args?:unknown)=>Promise<unknown>>(),
        },
        $transaction:jest.fn<(operations:Promise<unknown>[])=>Promise<unknown[]>>(),
    };
    beforeEach(()=>{
        jest.clearAllMocks();
        prisma.$transaction.mockImplementation(
            async(operations:Promise<unknown>[])=>{
                return Promise.all(operations);
            },
        );
        service=new NotificationsService(prisma as unknown as PrismaService);
    });
    describe('findAllForUser',()=>{
        it('returns notifications belonging to the supplied user',async()=>{
            const notifications=[{
                id:'notification-1',
                type:NotificationType.REMINDER,
                title:'Payment reminder',
                message:'Your payment is due soon.',
                sourceType:null,
                sourceId:null,
                readAt:null,
                createdAt:new Date(),
            },];
            prisma.notification.findMany.mockResolvedValue(notifications);
            prisma.notification.count.mockResolvedValue(1);
            const result=await service.findAllForUser(
                'user-1',{
                    page:1,
                    perPage:20,
                },
            );
            expect(prisma.notification.findMany).toHaveBeenCalledWith({
                where:{
                    userId:'user-1',
                    deletedAt:null,
                },
                orderBy:{
                    createdAt:'desc',
                },
                skip:0,
                take:20,
                select:{
                    id:true,
                    type:true,
                    title:true,
                    message:true,
                    sourceType:true,
                    sourceId:true,
                    readAt:true,
                    createdAt:true,
                },
            });
            expect(prisma.notification.count).toHaveBeenCalledWith({
                where:{
                    userId:'user-1',
                    deletedAt:null,
                },
            });
            expect(result).toEqual({
                notifications,
                pagination:{
                    page:1,
                    perPage:20,
                    total:1,
                    totalPages:1,
                },
            });
        });
        it('filters unread notifications using readAt null',async()=>{
            prisma.notification.findMany.mockResolvedValue([]);
            prisma.notification.count.mockResolvedValue(0);
            const result=await service.findAllForUser(
                'user-1',{
                    unreadOnly:true,
                    page:1,
                    perPage:20,
                },
            );
            expect(prisma.notification.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where:{
                        userId:'user-1',
                        deletedAt:null,
                        readAt:null,
                    },
                }),
            );
            expect(prisma.notification.count).toHaveBeenCalledWith({
                where:{
                    userId:'user-1',
                    deletedAt:null,
                    readAt:null,
                },
            });
            expect(result).toEqual({
                notifications:[],
                pagination:{
                    page:1,
                    perPage:20,
                    total:0,
                    totalPages:0,
                },
            });
        });
        it('filters notifications by notification type',async()=>{
            prisma.notification.findMany.mockResolvedValue([]);
            prisma.notification.count.mockResolvedValue(0);
            await service.findAllForUser(
                'user-1',{
                    type:NotificationType.REMINDER,
                    page:1,
                    perPage:20,
                },
            );
            expect(prisma.notification.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where:{
                        userId:'user-1',
                        deletedAt:null,
                        type:NotificationType.REMINDER,
                    },
                }),
            );
            expect(prisma.notification.count).toHaveBeenCalledWith({
                where:{
                    userId:'user-1',
                    deletedAt:null,
                    type:NotificationType.REMINDER,
                },
            });
        });
        it('combines unread and notification type filters',async()=>{
            prisma.notification.findMany.mockResolvedValue([]);
            prisma.notification.count.mockResolvedValue(0);
            await service.findAllForUser(
                'user-1',{
                    unreadOnly:true,
                    type:NotificationType.REMINDER,
                    page:1,
                    perPage:10,
                },
            );
            expect(prisma.notification.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where:{
                        userId:'user-1',
                        deletedAt:null,
                        readAt:null,
                        type:NotificationType.REMINDER,
                    },
                    skip:0,
                    take:10,
                }),
            );
        });
        it('applies pagination correctly',async()=>{
            prisma.notification.findMany.mockResolvedValue([]);
            prisma.notification.count.mockResolvedValue(11);
            const result=await service.findAllForUser(
                'user-1',{
                    page:2,
                    perPage:5,
                },
            );
            expect(prisma.notification.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip:5,
                    take:5,
                }),
            );
            expect(result.pagination).toEqual({
                page:2,
                perPage:5,
                total:11,
                totalPages:3,
            });
        });
        it('uses default pagination when values are missing',async()=>{
            prisma.notification.findMany.mockResolvedValue([]);
            prisma.notification.count.mockResolvedValue(0);
            const result=await service.findAllForUser(
                'user-1',
                new GetNotificationsQueryDto(),
            );
            expect(prisma.notification.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip:0,
                    take:20,
                }),
            );
            expect(result.pagination).toEqual({
                page:1,
                perPage:20,
                total:0,
                totalPages:0,
            });
        });
    });
    describe('markAsRead',()=>{
        it('searches using the notification ID and user ID',async()=>{
            const existingNotification={
                id:'notification-1',
                userId:'user-1',
                readAt:new Date(),
            };
            prisma.notification.findFirst.mockResolvedValue(
                existingNotification,
            );
            await service.markAsRead(
                'user-1',
                'notification-1',
            );
            expect(prisma.notification.findFirst).toHaveBeenCalledWith({
                where:{
                    id:'notification-1',
                    userId:'user-1',
                    deletedAt:null,
                },
            });
        });
        it('throws NotFoundException when the notification is not found',async()=>{
            prisma.notification.findFirst.mockResolvedValue(null);
            await expect(
                service.markAsRead(
                    'user-1',
                    'missing-notification',
                ),
            ).rejects.toThrow(
                new NotFoundException('Notification not found'),
            );
            expect(prisma.notification.update).not.toHaveBeenCalled();
        });
        it('prevents a user from marking another users notification as read',async()=>{
            prisma.notification.findFirst.mockResolvedValue(null);
            await expect(
                service.markAsRead(
                    'user-1',
                    'user-2-notification',
                ),
            ).rejects.toThrow(NotFoundException);
            expect(prisma.notification.findFirst).toHaveBeenCalledWith({
                where:{
                    id:'user-2-notification',
                    userId:'user-1',
                    deletedAt:null,
                },
            });
            expect(prisma.notification.update).not.toHaveBeenCalled();
        });
        it('returns an already-read notification without updating it',async()=>{
            const readAt=new Date();
            const existingNotification={
                id:'notification-1',
                userId:'user-1',
                readAt,
            };
            prisma.notification.findFirst.mockResolvedValue(
                existingNotification,
            );
            const result=await service.markAsRead(
                'user-1',
                'notification-1',
            );
            expect(result).toEqual(existingNotification);
            expect(prisma.notification.update).not.toHaveBeenCalled();
        });
        it('sets readAt when the notification is unread',async()=>{
            const unreadNotification={
                id:'notification-1',
                userId:'user-1',
                readAt:null,
            };
            const updatedNotification={
                ...unreadNotification,
                readAt:new Date(),
            };
            prisma.notification.findFirst.mockResolvedValue(
                unreadNotification,
            );
            prisma.notification.update.mockResolvedValue(
                updatedNotification,
            );
            const result=await service.markAsRead(
                'user-1',
                'notification-1',
            );
            expect(prisma.notification.update).toHaveBeenCalledWith({
                where:{
                    id:'notification-1',
                },
                data:{
                    readAt:expect.any(Date),
                },
            });
            expect(result).toEqual(updatedNotification);
        });
    });
    describe('create',()=>{
        it('creates a notification with the supplied values',async()=>{
            const createdNotification={
                id:'notification-1',
                userId:'user-1',
                type:NotificationType.REMINDER,
                title:'Payment reminder',
                message:'Your payment is due soon.',
                sourceType:null,
                sourceId:null,
            };
            prisma.notification.create.mockResolvedValue(createdNotification);
            const result=await service.create({
                userId:'user-1',
                type:NotificationType.REMINDER,
                title:'Payment reminder',
                message:'Your payment is due soon.',
            });
            expect(prisma.notification.create).toHaveBeenCalledWith({
                data:{
                    userId:'user-1',
                    type:NotificationType.REMINDER,
                    title:'Payment reminder',
                    message:'Your payment is due soon.',
                    sourceType:null,
                    sourceId:null,
                },
            });
            expect(result).toEqual(createdNotification);
        });
        it('saves sourceType and sourceId',async()=>{
            const sourceType=Object.values(UserEventSourceType)[0] as UserEventSourceType;
            prisma.notification.create.mockResolvedValue({
                id:'notification-1',
            });
            await service.create({
                userId:'user-1',
                type:NotificationType.REMINDER,
                title:'Payment reminder',
                message:'Your payment is due soon.',
                sourceType,
                sourceId:'occurrence-1',
            });
            expect(prisma.notification.create).toHaveBeenCalledWith({
                data:{
                    userId:'user-1',
                    type:NotificationType.REMINDER,
                    title:'Payment reminder',
                    message:'Your payment is due soon.',
                    sourceType,
                    sourceId:'occurrence-1',
                },
            });
        });
    });
});