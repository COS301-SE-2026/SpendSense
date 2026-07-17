import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { UsersService } from 'src/users/users.service'
import { UpdateReminderPreferencesDto } from './dto/update-reminder-preferences.dto'
import type { AuthUser } from 'src/auth/types/auth-user.type'

@Injectable()
export class RemindersService{
    constructor(
        private readonly prisma: PrismaService,
        private readonly usersService: UsersService,
    ){}

    async getReminderPreferences(authUser: AuthUser){
        const user = await this.usersService.findOrCreateUser(authUser);

        return user.notificationPreference;
    }

    async  updateReminderPreferences(authUser: AuthUser, dto: UpdateReminderPreferencesDto,){
        const user = await this.usersService.findOrCreateUser(authUser);

        return this.prisma.notificationPreference.update({
            where: {userId: user.id},
            data:dto,
            select: this.reminderPreferenceSelect
        });
    }

    private readonly reminderPreferenceSelect={
        quietHoursStart: true,
        quietHoursEnd: true,
        emailEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
        smsEnabled: true,
        defaultReminderDaysBefore: true,
    };
}