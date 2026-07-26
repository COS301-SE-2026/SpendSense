import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

// NotificationsModule: in app notification management
// TODO: implement NotificationsController and NotificationsService

// planned endpoints:
// GET /api/v1/notifications
// PATCH /api/v1/notifications/:id

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
