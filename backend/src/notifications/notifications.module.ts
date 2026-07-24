import { Module } from '@nestjs/common';
import {NotificationsController} from './notifications.controller';
import {NotificationsService} from './notifications.service';

// NotificationsModule: in app notification management
// TODO: implement NotificationsController and NotificationsService

// planned endpoints:
// GET /api/v1/notifications
// PATCH /api/v1/notifications/:id

@Module({
    controllers:[NotificationsController],
    providers:[NotificationsService],
    exports:[NotificationsService],
})
export class NotificationsModule {}
