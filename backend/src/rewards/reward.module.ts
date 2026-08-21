import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { RewardService } from './reward.service';

@Module({
  imports: [NotificationsModule],
  providers: [RewardService],
  exports: [RewardService],
})
export class RewardModule {}
