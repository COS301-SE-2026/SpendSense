import { RemindersService } from "./reminders.service";
import type { UsersService } from "../users/users.service";
import type { PrismaService } from "../prisma/prisma.service";
import { NotificationType, ReminderStatus, Reminder, UserEventSourceType } from '@prisma/client'

describe('RemindersService', ()=>{
    let usersService: jest.Mocked<Pick<UsersService, 'findOrCreateUser'>>;
    let service: RemindersService;
    let prisma:{
        notificationPreference: {update: jest.Mock};
        reminder: {findMany: jest.Mock};
        $transaction: jest.Mock;
    };
    let transaction:{
        notification: {create: jest.Mock};
        reminder: {update: jest.Mock};
    };

    const authUser ={
        email: 'testuser1@example.com',
        supabaseAuthId: 'test-supabase-user1'
    };

    const buildReminder=(overrides: Partial<Reminder> = {}): Reminder=>({
        userId: 'user-1',
        id: 'reminder-1',
        occurrenceId: 'occurrence-1',
        channel: 'IN_APP',
        sentAt: null,
        scheduledFor: new Date('2026-07-20T08:00:00.000Z'),
        status: ReminderStatus.SCHEDULED,
        message: 'Showmax is due in 3 days.',
        priority: "LOW",
        createdAt: new Date('2026-07-01T08:00:00.000Z'),
        updatedAt: new Date('2026-07-01T08:00:00.000Z'),
        deletedAt: null,
        ...overrides,

    }as Reminder);

    beforeEach(()=>{
        usersService={
            findOrCreateUser: jest.fn(),
        };

        prisma = {
            notificationPreference: {update: jest.fn()},
            reminder: {findMany: jest.fn()},
            $transaction: jest.fn().mockImplementation((callback) => callback(transaction)),
        };

        service = new RemindersService(
            prisma as unknown as PrismaService,
            usersService as unknown as UsersService,
        );

        transaction = {
            notification: {
                create: jest.fn(),
            },

            reminder: {
                update: jest.fn(),
            }
        }
    });

    it('updates the defaultReminderDaysBefore preference and returns updated row', async()=>{
        usersService.findOrCreateUser.mockResolvedValue({
            id: 'user-1',
        } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

        const updated={
            quietHoursStart: null,
            quietHoursEnd: null,
            emailEnabled: true,
            pushEnabled: false,
            inAppEnabled: true,
            smsEnabled: false,
            defaultReminderDaysBefore: 7,
        };
        prisma.notificationPreference.update.mockResolvedValue(updated);

        const dto = {defaultReminderDaysBefore: 7};

        await expect(
            service.updateReminderPreferences(authUser, dto),
        ).resolves.toEqual(updated);

        expect(prisma.notificationPreference.update).toHaveBeenCalledWith({
            data: dto, 
            where: {userId: 'user-1'},
            select:{
                quietHoursStart: true,
                quietHoursEnd: true,
                emailEnabled: true,
                pushEnabled: true,
                inAppEnabled: true,
                smsEnabled: true,
                defaultReminderDaysBefore: true,
            },
        });
    });

    it('return the current users reminder preferences', async()=>{
        usersService.findOrCreateUser.mockResolvedValue({
            id: 'user-1',
            notificationPreference:{
                quietHoursStart: null,
                quietHoursEnd: null,
                emailEnabled: true,
                pushEnabled: false,
                inAppEnabled: true,
                smsEnabled: false,
                defaultReminderDaysBefore: 3,
            },
        } as Awaited<ReturnType<UsersService['findOrCreateUser']>>);

        await expect(service.getReminderPreferences(authUser)).resolves.toEqual({
            quietHoursStart: null,
                quietHoursEnd: null,
                emailEnabled: true,
                pushEnabled: false,
                inAppEnabled: true,
                smsEnabled: false,
                defaultReminderDaysBefore: 3,
        });
        expect(usersService.findOrCreateUser).toHaveBeenCalledWith(authUser);
    });


    describe('processDueReminders', ()=>{
        
        it('process multiple reminders due and count them correctly', async()=>{
            const reminder1 = buildReminder({id: 'reminder-1', occurrenceId: 'occurrence-1'});
            const reminder2 = buildReminder({id: 'reminder-2', occurrenceId: 'occurrence-2'});

            prisma.reminder.findMany.mockResolvedValue([reminder1, reminder2]);
            const rslt = await service.processDueReminders();


            expect(rslt).toEqual({processedCount: 2});
            expect(transaction.notification.create).toHaveBeenCalledTimes(2);
            expect(transaction.reminder.update).toHaveBeenCalledTimes(2);
        });

        it('creates a notification and marks as SENT for each of the due reminders', async()=>{
            const reminder = buildReminder();

            prisma.reminder.findMany.mockResolvedValue([reminder]);
            const rslt = await service.processDueReminders();

            expect(transaction.notification.create).toHaveBeenCalledWith({
                data: {
                    userId: reminder.userId,
                    title: 'Payment reminder',
                    type: NotificationType.REMINDER,
                    message: reminder.message,
                    sourceId: reminder.occurrenceId,
                    sourceType: UserEventSourceType.PAYMENT_OCCURRENCE,
                },
            });

            expect(transaction.reminder.update).toHaveBeenCalledWith({
                where: {id: reminder.id},
                data: {
                    sentAt: expect.any(Date),
                    status: ReminderStatus.SENT,
                },
            });

            expect(rslt).toEqual({
                processedCount: 1,
            });
        });

        it('falls back to generic message when reminder does not have stored message', async()=>{
            const reminder = buildReminder({message: null});
            
            prisma.reminder.findMany.mockResolvedValue([reminder]);

            await service.processDueReminders();
            expect(transaction.notification.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    message: 'You have a payment coming up soon.'
                }),
            });
        });

        it('returns processedCount = 0 and does not do anything when no reminders due', async()=>{
            prisma.reminder.findMany.mockResolvedValue([]);
            const rslt = await service.processDueReminders();

            expect(rslt).toEqual({processedCount:0});
            expect(transaction.notification.create).not.toHaveBeenCalled();
            expect(transaction.reminder.update).not.toHaveBeenCalled();
            
        });

        it('queries with correct filter (SCHEDULED, scheduledFor <=now, sentAt null', async()=>{
            prisma.reminder.findMany.mockResolvedValue([]);

            await service.processDueReminders();

            expect(prisma.reminder.findMany).toHaveBeenCalledWith({
                where: {
                    sentAt: null,
                    status: ReminderStatus.SCHEDULED,
                    scheduledFor: {lte: expect.any(Date)},
                },
            });
        });
    });
});

