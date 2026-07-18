import { Get, Patch, Controller, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiUnauthorizedResponse, ApiOkResponse } from '@nestjs/swagger';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import { UpdateReminderPreferencesDto } from './dto/update-reminder-preferences.dto';
import { RemindersService } from './reminders.service';
import type { AuthUser } from '../auth/types/auth-user.type';

@Controller('reminder-preferences')
@ApiBearerAuth()
@ApiTags('reminders')
@UseGuards(SupabaseJwtGuard)

export class RemindersController{
    constructor(
        private readonly remindersService: RemindersService
    ){}

    @ApiOkResponse({
        description: 'The current reminder preferences.',
        schema:{
            example:{
                data:{
                    quietHoursStart: null,
                    quietHoursEnd: null,
                    emailEnabled: true,
                    pushEnabled: false,
                    inAppEnabled: true,
                    smsEnabled: false,
                    defaultReminderDaysBefore: 3,
                },
            },
        },
    })

    @ApiUnauthorizedResponse({
        description: 'Missing or invalid Supabase Bearer token.',
    })

    @ApiOperation({
        summary: 'Get authenticated users reminder preferences',
        description: 'Return the current reminder preference settings for the authenticated user in Supabase.',
    })

    @Get()
    async getReminderPreferences(@CurrentAuthUser() authUser: AuthUser){
        return this.remindersService.getReminderPreferences(authUser);
    }

    @ApiOkResponse({
        description: 'The updated reminder preferences.',
    })

    @ApiUnauthorizedResponse({
        description: 'Missing or invalid Supabase Bearer token.'
    })

    @ApiOperation({
        summary: 'Update authenticated users reminder preferences',
        description: 'Partially updates the reminder preference settings for the authenticated user in Supabase.',
    })

    @Patch()
    async updateReminderPreferences(
        @Body() dto: UpdateReminderPreferencesDto, 
        @CurrentAuthUser() authUser: AuthUser,
    ){
        return this.remindersService.updateReminderPreferences(authUser,dto);
    }
}