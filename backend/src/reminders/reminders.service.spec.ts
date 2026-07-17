import { RemindersService } from "./reminders.service";
import type { UsersService } from "src/users/users.service";
import type { PrismaService } from "src/prisma/prisma.service";

describe('RemindersService', ()=>{
    let usersService: jest.Mocked<Pick<UsersService, 'findOrCreateUser'>>;
    let service: RemindersService;
    let prisma:{
        notificationPreference:{
            update: jest.Mock
        };
    };

    const authUser ={
        email: 'testuser1@example.com',
        supabaseAuthId: 'test-supabase-user1'
    };

    beforeEach(()=>{
        usersService={
            findOrCreateUser: jest.fn(),
        };

        prisma = {
            notificationPreference: {
                update: jest.fn()
            },
        };

        service = new RemindersService(
            prisma as unknown as PrismaService,
            usersService as unknown as UsersService,
        );
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
});