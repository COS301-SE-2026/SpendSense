import {Controller,Get,Param,Patch,Query,UseGuards,} from '@nestjs/common';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CurrentAuthUser } from 'src/common/decorators/current-auth-user.decorator';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(SupabaseJwtGuard)
export class NotificationsController {
    constructor(private readonly notificationsService:NotificationsService,){}
    @Get()
    async findAll(
        @CurrentAuthUser() authUser:AuthUser,
        @Query() query:GetNotificationsQueryDto,
    ){
        const userId=await this.resolveInternalUserId(authUser);
        return this.notificationsService.findAllForUser(userId,query);
    }
    @Patch(':id/read')
    async markAsRead(
        @CurrentAuthUser() authUser:AuthUser,
        @Param('id') notificationId:string,
    ){
        const userId=await this.resolveInternalUserId(authUser);
        return this.notificationsService.markAsRead(userId,notificationId);
    }
    private async resolveInternalUserId(authUser:AuthUser):Promise<string> {
        throw new Error(`Replace with the existing user lookup for ${authUser.supabaseAuthId}`,);
    }
}