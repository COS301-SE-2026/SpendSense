import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { BadgeEngineService } from './badge-engine.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { RewardModule } from '../rewards/reward.module';
// GamificationModule: streaks, coins, badges, mascots state

// planned endpoints:
// GET /api/v1/gamification/profile
// GET /api/v1/gamification/badges

@Module({
  imports: [AuthModule, UsersModule, NotificationsModule, RewardModule],
  controllers: [GamificationController],
  providers: [GamificationService, BadgeEngineService],
  exports: [GamificationService, BadgeEngineService],
})
export class GamificationModule {}
