import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  Delete
} from '@nestjs/common';
import { SupabaseJwtGuard } from '../auth/guards/supabase-jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CurrentAuthUser } from '../common/decorators/current-auth-user.decorator';
import { UsersService } from '../users/users.service';
import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { NotificationsService } from './notifications.service';
import { Body } from '@nestjs/common';
import { BulkNotificationIdsDto } from './dto/bulk-notifications.dto'

@Controller('notifications')
@UseGuards(SupabaseJwtGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}
  @Get()
  async findAll(
    @CurrentAuthUser() authUser: AuthUser,
    @Query() query: GetNotificationsQueryDto,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.notificationsService.findAllForUser(user.id, query);
  }
  @Patch(':id/read')
  async markAsRead(
    @CurrentAuthUser() authUser: AuthUser,
    @Param('id') notificationId: string,
  ) {
    const user = await this.usersService.findOrCreateUser(authUser);
    return this.notificationsService.markAsRead(user.id, notificationId);
  }
  @Delete(':id')
  async remove(
    @CurrentAuthUser() authUser:AuthUser,
    @Param('id') notificationId:string,
  ){
    const user=await this.usersService.findOrCreateUser(authUser);
    return this.notificationsService.softDelete(user.id,notificationId);
  }
  @Patch('read')
  async markManyAsRead(
    @CurrentAuthUser() authUser:AuthUser,
    @Body() body:BulkNotificationIdsDto,
  ){
    const user=await this.usersService.findOrCreateUser(authUser);
    return this.notificationsService.markManyAsRead(user.id,body.ids);
  }

  @Delete()
  async removeMany(
    @CurrentAuthUser() authUser:AuthUser,
    @Body() body:BulkNotificationIdsDto,
  ){
    const user=await this.usersService.findOrCreateUser(authUser);
    return this.notificationsService.softDeleteMany(user.id,body.ids);
  }
}
